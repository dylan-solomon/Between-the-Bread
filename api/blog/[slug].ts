import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { isSlug } from '../_lib/slug.js'
import { setPublicCache } from '../_lib/publicCache.js'
import { isPostRow, withCategories } from '../_lib/blogPostColumns.js'
import { DETAIL_POST_COLUMNS, LIST_POST_COLUMNS, MORE_POSTS_COUNT, nowIso } from '../_lib/blogPublic.js'

type DetailRow = {
  id: string
  related_sandwich_slugs: string[]
  blog_post_categories: { blog_categories: { id: string; slug: string; name: string; display_order: number } }[]
} & Record<string, unknown>

const isDetailRow = (value: unknown): value is DetailRow =>
  typeof value === 'object' && value !== null && 'id' in value && 'blog_post_categories' in value

type Sandwich = { name: string; slug: string; image_url: string | null; description: string | null }

type Failure = { failed: true }
type Loaded<T> = T | Failure

const isFailure = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && 'failed' in value

const liveListPosts = () =>
  supabase
    .from('blog_posts')
    .select(LIST_POST_COLUMNS)
    .eq('published', true)
    .lte('published_at', nowIso())

const toListPosts = (data: unknown): Record<string, unknown>[] =>
  (data as unknown[]).filter(isPostRow).map(withCategories)

const loadRelatedSandwiches = async (slugs: string[]): Promise<Loaded<Sandwich[]>> => {
  if (slugs.length === 0) return []

  const { data, error } = await supabase
    .from('sandwich_database')
    .select('name, slug, image_url, description')
    .eq('published', true)
    .in('slug', slugs)
  if (error !== null) return { failed: true }

  const found = data as Sandwich[]
  return slugs.flatMap((slug) => found.filter((sandwich) => sandwich.slug === slug))
}

const loadSharedCategoryPosts = async (
  postId: string,
  categoryIds: string[],
): Promise<Loaded<Record<string, unknown>[]>> => {
  if (categoryIds.length === 0) return []

  const links = await supabase
    .from('blog_post_categories')
    .select('post_id')
    .in('category_id', categoryIds)
    .neq('post_id', postId)
  if (links.error !== null) return { failed: true }

  const ids = [...new Set((links.data as { post_id: string }[]).map((link) => link.post_id))]
  if (ids.length === 0) return []

  const { data, error } = await liveListPosts()
    .in('id', ids)
    .order('published_at', { ascending: false })
    .limit(MORE_POSTS_COUNT)
  if (error !== null) return { failed: true }

  return toListPosts(data)
}

const loadMorePosts = async (
  postId: string,
  categoryIds: string[],
): Promise<Loaded<Record<string, unknown>[]>> => {
  const shared = await loadSharedCategoryPosts(postId, categoryIds)
  if (isFailure(shared)) return shared
  if (shared.length >= MORE_POSTS_COUNT) return shared

  const { data, error } = await liveListPosts()
    .neq('id', postId)
    .order('published_at', { ascending: false })
    .limit(MORE_POSTS_COUNT + shared.length)
  if (error !== null) return { failed: true }

  const taken = new Set(shared.map((post) => post.slug))
  const fill = toListPosts(data).filter((post) => !taken.has(post.slug))
  return [...shared, ...fill].slice(0, MORE_POSTS_COUNT)
}

const notFound = (res: VercelResponse): void => {
  res.status(404).json(err('POST_NOT_FOUND', 'Post not found.', 404))
}

const failed = (res: VercelResponse): void => {
  res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch post.', 500))
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
    .from('blog_posts')
    .select(DETAIL_POST_COLUMNS)
    .eq('slug', slug)
    .eq('published', true)
    .lte('published_at', nowIso())
    .maybeSingle()

  if (error !== null) {
    failed(res)
    return
  }
  const loaded: unknown = data
  if (!isDetailRow(loaded)) {
    notFound(res)
    return
  }

  const row = loaded
  const { related_sandwich_slugs: relatedSlugs, ...post } = row

  const relatedSandwiches = await loadRelatedSandwiches(relatedSlugs)
  if (isFailure(relatedSandwiches)) {
    failed(res)
    return
  }

  const categoryIds = row.blog_post_categories.map((link) => link.blog_categories.id)
  const morePosts = await loadMorePosts(row.id, categoryIds)
  if (isFailure(morePosts)) {
    failed(res)
    return
  }

  setPublicCache(res)
  res.status(200).json(ok({
    ...withCategories(post),
    related_sandwiches: relatedSandwiches,
    more_posts: morePosts,
  }))
}
