import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../_lib/adminAuth.js'
import { resolveCategoryIds } from '../../_lib/blogCategoryLookup.js'
import { ADMIN_POST_COLUMNS, isPostRow, toAdminPost } from '../../_lib/blogPostColumns.js'
import { parseBlogPostInput } from '../../_lib/blogPostInput.js'

const DUPLICATE_KEY = '23505'
const NO_ROWS = 'PGRST116'

type ExistingPost = {
  id: string
  published: boolean
  published_at: string | null
  blog_post_categories: { count: number }[]
}

const notFound = (res: VercelResponse): void => {
  res.status(404).json(err('POST_NOT_FOUND', 'Post not found.', 404))
}

const handlePatch = async (
  req: VercelRequest,
  res: VercelResponse,
  auth: AdminAuthResult,
  slug: string,
): Promise<void> => {
  const parsed = parseBlogPostInput(req.body, 'update')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  const lookup = await auth.supabase
    .from('blog_posts')
    .select('id, published, published_at, blog_post_categories(count)')
    .eq('slug', slug)
    .maybeSingle()

  if (lookup.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to update post.', 500))
    return
  }
  if (lookup.data === null) {
    notFound(res)
    return
  }

  const existing = lookup.data as ExistingPost

  const categories = parsed.categorySlugs === undefined
    ? undefined
    : await resolveCategoryIds(auth.supabase, parsed.categorySlugs)
  if (categories !== undefined && !categories.ok) {
    res.status(categories.status).json(err(categories.status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR', categories.message, categories.status))
    return
  }

  const categoryCount = categories === undefined ? existing.blog_post_categories.reduce((total, link) => total + link.count, 0) : categories.ids.length
  const willBePublished = parsed.value.published ?? existing.published
  if (willBePublished === true && categoryCount === 0) {
    res.status(400).json(err('CATEGORY_REQUIRED', 'A post needs at least one category to be published.', 400))
    return
  }

  const publishStamp = parsed.value.published === true && existing.published_at === null && parsed.value.published_at === undefined
    ? { published_at: new Date().toISOString() }
    : {}

  const updated = await auth.supabase
    .from('blog_posts')
    .update({ ...parsed.value, ...publishStamp, updated_at: new Date().toISOString() })
    .eq('id', existing.id)

  if (updated.error !== null) {
    const duplicate = (updated.error as { code?: string }).code === DUPLICATE_KEY
    res.status(duplicate ? 409 : 500).json(
      duplicate
        ? err('SLUG_TAKEN', 'A post with that slug already exists.', 409)
        : err('INTERNAL_ERROR', 'Failed to update post.', 500),
    )
    return
  }

  if (categories !== undefined) {
    const saved = await auth.supabase.rpc('replace_blog_post_categories', {
      p_post_id: existing.id,
      p_category_ids: categories.ids,
    })
    if (saved.error !== null) {
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to save post categories.', 500))
      return
    }
  }

  const { data, error } = await auth.supabase
    .from('blog_posts')
    .select(ADMIN_POST_COLUMNS)
    .eq('id', existing.id)
    .single()

  if (error !== null || !isPostRow(data)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Post was updated but could not be loaded.', 500))
    return
  }

  res.status(200).json(ok(toAdminPost(data)))
}

const unpublish = async (res: VercelResponse, auth: AdminAuthResult, slug: string): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('blog_posts')
    .update({ published: false, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select(ADMIN_POST_COLUMNS)
    .single()

  if (error !== null) {
    if ((error as { code?: string }).code === NO_ROWS) {
      notFound(res)
      return
    }
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to unpublish post.', 500))
    return
  }

  res.status(200).json(ok(isPostRow(data) ? toAdminPost(data) : data))
}

const deletePermanently = async (res: VercelResponse, auth: AdminAuthResult, slug: string): Promise<void> => {
  const lookup = await auth.supabase
    .from('blog_posts')
    .select('id, published')
    .eq('slug', slug)
    .maybeSingle()

  if (lookup.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to delete post.', 500))
    return
  }
  if (lookup.data === null) {
    notFound(res)
    return
  }

  if ((lookup.data as { published: boolean }).published) {
    res.status(409).json(err('POST_PUBLISHED', 'Unpublish the post before deleting it permanently.', 409))
    return
  }

  const { error } = await auth.supabase.from('blog_posts').delete().eq('slug', slug)

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to delete post.', 500))
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
    await unpublish(res, auth, slug)
    return
  }

  await handlePatch(req, res, auth, slug)
}
