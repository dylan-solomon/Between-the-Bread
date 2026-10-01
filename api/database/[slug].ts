import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { isSlug } from '../_lib/slug.js'

const DETAIL_COLUMNS =
  'id, name, slug, alternative_names, description, history, origin_country, origin_region, canonical_ingredients, dietary_tags, image_url, avg_rating, rating_count'

const BLOG_POST_COLUMNS = 'slug, title, excerpt, cover_image_url, published_at, reading_time_minutes'
const MAX_BLOG_POSTS = 5

const notFound = (res: VercelResponse): void => {
  res.status(404).json(err('SANDWICH_NOT_FOUND', 'Sandwich not found.', 404))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug : ''
  if (!isSlug(slug)) {
    notFound(res)
    return
  }

  const { data, error } = await supabase
    .from('sandwich_database')
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch sandwich.', 500))
    return
  }

  if (data === null) {
    notFound(res)
    return
  }

  const sandwich = data as { id: string }

  const [comments, photos, blogPosts] = await Promise.all([
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'database')
      .eq('target_id', sandwich.id),
    supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'database')
      .eq('target_id', sandwich.id)
      .eq('is_approved', true),
    supabase
      .from('blog_posts')
      .select(BLOG_POST_COLUMNS)
      .contains('related_sandwich_slugs', [slug])
      .eq('published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(MAX_BLOG_POSTS),
  ])

  if (comments.error !== null || photos.error !== null || blogPosts.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch sandwich.', 500))
    return
  }

  res.status(200).json(ok({
    ...sandwich,
    comment_count: comments.count ?? 0,
    photo_count: photos.count ?? 0,
    blog_posts: blogPosts.data,
  }))
}
