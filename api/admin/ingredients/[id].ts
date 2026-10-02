import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../_lib/adminAuth.js'
import { hasCompleteCost, hasCompleteNutrition } from '../../_lib/ingredientData.js'

const COLUMNS = 'id, category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled, created_at, updated_at'

const MOVE_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  '23505': { status: 409, code: 'SLUG_TAKEN', message: 'Another ingredient in that category already uses this slug.' },
  '23503': { status: 400, code: 'INVALID_CATEGORY', message: 'That category does not exist.' },
  P0002: { status: 404, code: 'INGREDIENT_NOT_FOUND', message: 'Ingredient not found.' },
}

const moveToCategory = async (
  res: VercelResponse,
  auth: AdminAuthResult,
  id: string,
  categoryId: unknown,
): Promise<void> => {
  const moved = await auth.supabase.rpc('move_ingredient_category', { p_ingredient_id: id, p_category_id: categoryId })
  if (moved.error !== null) {
    const known = MOVE_ERRORS[(moved.error as { code?: string }).code ?? ''] as (typeof MOVE_ERRORS)[string] | undefined
    if (known === undefined) {
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to move ingredient.', 500))
      return
    }
    res.status(known.status).json(err(known.code, known.message, known.status))
    return
  }

  const { data, error } = await auth.supabase.from('ingredients').select(COLUMNS).eq('id', id).single()
  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Ingredient was moved but could not be loaded.', 500))
    return
  }

  res.status(200).json(ok(data, { entries_updated: moved.data as number }))
}

const UPDATABLE_FIELDS = [
  'name',
  'slug',
  'category_id',
  'dietary_tags',
  'compat_group',
  'estimated_cost',
  'nutrition',
  'image_asset',
  'is_trigger',
  'enabled',
] as const

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'PATCH') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  const { id } = req.query as { id: string }
  const body = (req.body ?? {}) as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  for (const field of UPDATABLE_FIELDS) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json(err('NO_UPDATES', 'Request body must contain at least one updatable field.', 400))
    return
  }

  if ('category_id' in updates) {
    if (Object.keys(updates).length > 1) {
      res.status(400).json(err('CATEGORY_CHANGE_ALONE', 'Change the category on its own, without other fields.', 400))
      return
    }
    await moveToCategory(res, auth, id, updates.category_id)
    return
  }

  if ('nutrition' in updates && !hasCompleteNutrition(updates.nutrition)) {
    res.status(400).json(err('INVALID_NUTRITION', 'Nutrition needs a number of zero or more for every field.', 400))
    return
  }

  if ('estimated_cost' in updates && !hasCompleteCost(updates.estimated_cost)) {
    res.status(400).json(err('INVALID_COST', 'Cost needs a number of zero or more for every field, with each low no higher than its high.', 400))
    return
  }

  if (updates.enabled === true) {
    const suppliesBoth = hasCompleteNutrition(updates.nutrition) && hasCompleteCost(updates.estimated_cost)
    if (!suppliesBoth) {
      const stored = await auth.supabase.from('ingredients').select('nutrition, estimated_cost').eq('id', id).single()
      if (stored.error !== null) {
        res.status(404).json(err('INGREDIENT_NOT_FOUND', 'Ingredient not found.', 404))
        return
      }
      const current = stored.data as { nutrition: unknown; estimated_cost: unknown }
      const nutrition = 'nutrition' in updates ? updates.nutrition : current.nutrition
      const cost = 'estimated_cost' in updates ? updates.estimated_cost : current.estimated_cost
      if (!(hasCompleteNutrition(nutrition) && hasCompleteCost(cost))) {
        res.status(400).json(err('INCOMPLETE_INGREDIENT', 'Add nutrition and cost data before enabling this ingredient.', 400))
        return
      }
    }
  }

  const { data, error } = await auth.supabase
    .from('ingredients')
    .update(updates)
    .eq('id', id)
    .select(COLUMNS)
    .single()

  if (error !== null) {
    res.status(404).json(err('INGREDIENT_NOT_FOUND', 'Ingredient not found.', 404))
    return
  }

  res.status(200).json(ok(data))
}
