import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../_lib/adminAuth.js'
import { ADMIN_SANDWICH_COLUMNS } from '../../_lib/sandwichColumns.js'
import { parseSandwichInput } from '../../_lib/sandwichInput.js'

const DUPLICATE_KEY = '23505'
const NO_ROWS = 'PGRST116'
const PHOTO_BUCKET = 'user-photos'

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
    .select(ADMIN_SANDWICH_COLUMNS)
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

const deletePermanently = async (
  res: VercelResponse,
  auth: AdminAuthResult,
  slug: string,
): Promise<void> => {
  const lookup = await auth.supabase
    .from('sandwich_database')
    .select('id, published')
    .eq('slug', slug)
    .maybeSingle()

  if (lookup.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to delete sandwich.', 500))
    return
  }

  if (lookup.data === null) {
    res.status(404).json(err('SANDWICH_NOT_FOUND', 'Sandwich not found.', 404))
    return
  }

  const { id, published } = lookup.data as { id: string; published: boolean }

  if (published) {
    res.status(409).json(err('SANDWICH_PUBLISHED', 'Unpublish the sandwich before deleting it permanently.', 409))
    return
  }

  const photos = await auth.supabase
    .from('photos')
    .select('storage_path')
    .eq('target_type', 'database')
    .eq('target_id', id)

  if (photos.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to delete sandwich.', 500))
    return
  }

  const paths = (photos.data as { storage_path: string }[]).map((photo) => photo.storage_path)

  if (paths.length > 0) {
    const removal = await auth.supabase.storage.from(PHOTO_BUCKET).remove(paths)
    if (removal.error !== null) {
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to remove sandwich photos.', 500))
      return
    }
  }

  const { error } = await auth.supabase.from('sandwich_database').delete().eq('slug', slug)

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to delete sandwich.', 500))
    return
  }

  res.status(200).json(ok({ slug, deleted: true }))
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
    if (req.query.permanent === 'true') {
      await deletePermanently(res, auth, slug)
      return
    }
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
