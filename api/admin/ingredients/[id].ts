import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import { hasCompleteCost, hasCompleteNutrition } from '../../_lib/ingredientData.js'

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
    .select('id, category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled, created_at, updated_at')
    .single()

  if (error !== null) {
    res.status(404).json(err('INGREDIENT_NOT_FOUND', 'Ingredient not found.', 404))
    return
  }

  res.status(200).json(ok(data))
}
