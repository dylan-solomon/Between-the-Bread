import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateRequest } from '../../_lib/auth.js'

const REQUIRED_CATEGORIES = ['bread', 'protein', 'cheese', 'toppings', 'condiments'] as const

type Composition = Record<string, unknown[]>

const isValidComposition = (composition: unknown): composition is Composition => {
  if (typeof composition !== 'object' || composition === null) return false
  return REQUIRED_CATEGORIES.every(
    (cat) =>
      cat in (composition as Record<string, unknown>) &&
      Array.isArray((composition as Record<string, unknown>)[cat]),
  )
}

const VALID_SORTS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  rating_high: { column: 'rating', ascending: false },
  rating_low: { column: 'rating', ascending: true },
  name_asc: { column: 'name', ascending: true },
  name_desc: { column: 'name', ascending: false },
}

const handlePost = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>
  const { composition, name, total_estimated_cost, total_nutrition } = body

  if (!isValidComposition(composition)) {
    res.status(400).json(err('INVALID_COMPOSITION', 'Composition must include all required categories.', 400))
    return
  }

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json(err('INVALID_NAME', 'Name is required.', 400))
    return
  }

  const { data, error } = await supabase
    .from('saved_sandwiches')
    .insert({
      user_id: user.id,
      composition,
      name: name.trim(),
      total_estimated_cost: total_estimated_cost ?? null,
      total_nutrition: total_nutrition ?? null,
    })
    .select('id, name, rating, is_favorite, created_at')
    .single()

  if (error !== null) {
    res.status(500).json(err('SAVE_FAILED', 'Failed to save sandwich.', 500))
    return
  }

  res.status(201).json(ok(data))
}

const handleGet = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const {
    q,
    rating,
    favorites_only,
    sort = 'newest',
    limit: limitStr = '20',
    offset: offsetStr = '0',
  } = req.query as Record<string, string | undefined>

  const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 50)
  const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0)
  const sortConfig = VALID_SORTS[sort ?? 'newest'] ?? VALID_SORTS.newest

  let query = supabase
    .from('saved_sandwiches')
    .select('id, name, composition, total_estimated_cost, total_nutrition, rating, is_favorite, created_at', { count: 'exact' })
    .eq('user_id', user.id)

  if (typeof q === 'string' && q.trim() !== '') {
    query = query.ilike('name', `%${q.trim()}%`)
  }

  if (typeof rating === 'string') {
    const ratingVal = parseInt(rating, 10)
    if (ratingVal === 0) {
      query = query.is('rating', null)
    } else if (ratingVal >= 1 && ratingVal <= 5) {
      query = query.eq('rating', ratingVal)
    }
  }

  if (favorites_only === 'true') {
    query = query.eq('is_favorite', true)
  }

  query = query
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error !== null) {
    res.status(500).json(err('FETCH_FAILED', 'Failed to fetch saved sandwiches.', 500))
    return
  }

  res.status(200).json(ok(data, { count: data?.length ?? 0, total: count ?? 0, limit, offset }))
}

const handleDelete = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>

  if (body.confirm !== true) {
    res.status(400).json(err('CONFIRMATION_REQUIRED', 'confirm: true is required.', 400))
    return
  }

  const includeFavorites = body.include_favorites === true

  let query = supabase
    .from('saved_sandwiches')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)

  if (!includeFavorites) {
    query = query.eq('is_favorite', false)
  }

  const { count, error } = await query

  if (error !== null) {
    res.status(500).json(err('DELETE_FAILED', 'Failed to clear history.', 500))
    return
  }

  res.status(200).json(ok({ deleted_count: count ?? 0 }))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  switch (req.method) {
    case 'POST':
      await handlePost(req, res)
      return
    case 'GET':
      await handleGet(req, res)
      return
    case 'DELETE':
      await handleDelete(req, res)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
