import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../_lib/adminAuth.js'
import { parseSandwichInput } from '../../_lib/sandwichInput.js'

const ADMIN_COLUMNS =
  'id, name, slug, description, history, origin_country, origin_region, canonical_ingredients, dietary_tags, image_url, avg_rating, rating_count, published, created_at, updated_at'

const DUPLICATE_KEY = '23505'
const NO_ROWS = 'PGRST116'

const updateBySlug = async (
  res: VercelResponse,
  auth: AdminAuthResult,
  slug: string,
  updates: Record<string, unknown>,
): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('sandwich_database')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select(ADMIN_COLUMNS)
    .single()

  if (error === null) {
    res.status(200).json(ok(data))
    return
  }

  const code = (error as { code?: string }).code
  if (code === NO_ROWS) {
    res.status(404).json(err('SANDWICH_NOT_FOUND', 'Sandwich not found.', 404))
    return
  }
  if (code === DUPLICATE_KEY) {
    res.status(409).json(err('SLUG_TAKEN', 'A sandwich with that slug already exists.', 409))
    return
  }
  res.status(500).json(err('INTERNAL_ERROR', 'Failed to update sandwich.', 500))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''

  if (req.method === 'DELETE') {
    await updateBySlug(res, auth, slug, { published: false })
    return
  }

  const parsed = parseSandwichInput(req.body, 'update')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  await updateBySlug(res, auth, slug, parsed.value)
}
