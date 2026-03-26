import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateRequest } from '../../_lib/auth.js'

const handlePatch = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase } = auth
  const { id } = req.query as { id: string }
  const body = (req.body ?? {}) as Record<string, unknown>

  const updates: Record<string, unknown> = {}

  if ('rating' in body) {
    const rating = body.rating
    if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      res.status(400).json(err('INVALID_RATING', 'Rating must be an integer 1-5 or null.', 400))
      return
    }
    updates.rating = rating
  }

  if ('is_favorite' in body) {
    if (typeof body.is_favorite !== 'boolean') {
      res.status(400).json(err('INVALID_FAVORITE', 'is_favorite must be a boolean.', 400))
      return
    }
    updates.is_favorite = body.is_favorite
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json(err('NO_UPDATES', 'Request body must contain rating or is_favorite.', 400))
    return
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('saved_sandwiches')
    .update(updates)
    .eq('id', id)
    .select('id, rating, is_favorite, updated_at')
    .single()

  if (error !== null) {
    res.status(404).json(err('SANDWICH_NOT_FOUND', 'Saved sandwich not found.', 404))
    return
  }

  res.status(200).json(ok(data))
}

const handleDelete = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase } = auth
  const { id } = req.query as { id: string }

  const { error } = await supabase
    .from('saved_sandwiches')
    .delete()
    .eq('id', id)

  if (error !== null) {
    res.status(500).json(err('DELETE_FAILED', 'Failed to delete sandwich.', 500))
    return
  }

  res.status(204).end()
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  switch (req.method) {
    case 'PATCH':
      await handlePatch(req, res)
      return
    case 'DELETE':
      await handleDelete(req, res)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
