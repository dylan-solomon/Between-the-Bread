import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '../../_lib/response.js'

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

const handleGet = async (res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const { data, error } = await supabase.from('ingredients').select('*').order('name')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch ingredients.', 500))
    return
  }

  res.status(200).json(ok(data))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const { category_id, name, slug } = body

  if (typeof category_id !== 'string' || category_id.trim() === '') {
    res.status(400).json(err('MISSING_CATEGORY_ID', 'category_id is required.', 400))
    return
  }
  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json(err('MISSING_NAME', 'name is required.', 400))
    return
  }
  if (typeof slug !== 'string' || slug.trim() === '') {
    res.status(400).json(err('MISSING_SLUG', 'slug is required.', 400))
    return
  }

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      category_id,
      name,
      slug,
      dietary_tags: Array.isArray(body.dietary_tags) ? body.dietary_tags : [],
      compat_group: typeof body.compat_group === 'string' ? body.compat_group : null,
      estimated_cost: body.estimated_cost ?? null,
      nutrition: body.nutrition ?? null,
      image_asset: typeof body.image_asset === 'string' ? body.image_asset : null,
      is_trigger: body.is_trigger === true,
      enabled: body.enabled !== false,
    })
    .select('id, category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled, created_at, updated_at')
    .single()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to create ingredient.', 500))
    return
  }

  res.status(201).json(ok(data))
}

const handlePatch = async (req: VercelRequest, res: VercelResponse, supabase: SupabaseClient, id: string): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  for (const field of UPDATABLE_FIELDS) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json(err('NO_UPDATES', 'Request body must contain at least one updatable field.', 400))
    return
  }

  const { data, error } = await supabase
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

export default async function handleIngredients(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
  id: string | undefined,
): Promise<void> {
  switch (req.method) {
    case 'GET':
      await handleGet(res, supabase)
      return
    case 'POST':
      await handlePost(req, res, supabase)
      return
    case 'PATCH':
      if (id === undefined) {
        res.status(400).json(err('MISSING_ID', 'Ingredient id is required.', 400))
        return
      }
      await handlePatch(req, res, supabase, id)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
