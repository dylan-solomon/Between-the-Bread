import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { setPublicCache } from '../_lib/publicCache.js'
import { isSlug } from '../_lib/slug.js'

const DETAIL_COLUMNS =
  'id, slug, name, fun_name, composition, dietary_tags, generated_count, avg_rating, rating_count, first_generated_by, created_at'

type Maker = { username: string; is_admin: boolean }

const notFound = (res: VercelResponse): void => {
  res.status(404).json(err('COMMUNITY_SANDWICH_NOT_FOUND', 'Community sandwich not found.', 404))
}

const failed = (res: VercelResponse): void => {
  res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch community sandwich.', 500))
}

const isMakerRow = (value: unknown): value is { username: string; is_admin?: unknown } =>
  typeof value === 'object' && value !== null && 'username' in value && typeof value.username === 'string'

const loadMaker = async (userId: unknown): Promise<Maker | null> => {
  if (typeof userId !== 'string') return null
  const response = await supabase.rpc('public_usernames', { p_ids: [userId] })
  const data: unknown = response.data
  if (response.error !== null || !Array.isArray(data)) return null
  const row = (data as unknown[]).find(isMakerRow)
  return row === undefined ? null : { username: row.username, is_admin: row.is_admin === true }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { slug } = req.query
  if (!isSlug(slug)) {
    notFound(res)
    return
  }

  const { data, error } = await supabase.from('community_sandwiches').select(DETAIL_COLUMNS).eq('slug', slug).maybeSingle()
  if (error !== null) {
    failed(res)
    return
  }
  if (data === null) {
    notFound(res)
    return
  }

  const { first_generated_by: firstMakerId, ...sandwich } = data as Record<string, unknown> & { id: string }

  const [comments, photos, maker] = await Promise.all([
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'community')
      .eq('target_id', sandwich.id),
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'community')
      .eq('target_id', sandwich.id)
      .eq('is_approved', true),
    loadMaker(firstMakerId),
  ])

  if (comments.error !== null || photos.error !== null) {
    failed(res)
    return
  }

  setPublicCache(res)
  res.status(200).json(ok({
    ...sandwich,
    comment_count: comments.count ?? 0,
    photo_count: photos.count ?? 0,
    first_made_by: maker,
  }))
}
