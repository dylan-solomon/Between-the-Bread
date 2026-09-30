import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../_lib/response.js'
import { authenticateAdminRequest } from '../_lib/adminAuth.js'
import type { AdminAuthResult } from '../_lib/adminAuth.js'

const handleGet = async (res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const { data, error } = await auth.supabase.from('ingredients').select('*').order('name')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch ingredients.', 500))
    return
  }

  res.status(200).json(ok(data))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
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

  const { data, error } = await auth.supabase
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  if (req.method === 'GET') {
    await handleGet(res, auth)
    return
  }

  await handlePost(req, res, auth)
}
