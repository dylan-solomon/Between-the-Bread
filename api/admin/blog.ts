import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../_lib/response.js'
import { authenticateAdminRequest } from '../_lib/adminAuth.js'
import type { AdminAuthResult } from '../_lib/adminAuth.js'
import { resolveCategoryIds } from '../_lib/blogCategoryLookup.js'
import { ADMIN_POST_COLUMNS, isPostRow, toAdminPost } from '../_lib/blogPostColumns.js'
import { parseBlogPostInput } from '../_lib/blogPostInput.js'

const DUPLICATE_KEY = '23505'
const DEFAULT_AUTHOR_NAME = 'Between the Bread'

const handleGet = async (res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('blog_posts')
    .select(ADMIN_POST_COLUMNS)
    .order('updated_at', { ascending: false })

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch posts.', 500))
    return
  }

  res.status(200).json(ok((data as unknown[]).filter(isPostRow).map(toAdminPost)))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const parsed = parseBlogPostInput(req.body, 'create')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  const categorySlugs = parsed.categorySlugs ?? []
  if (parsed.value.published === true && categorySlugs.length === 0) {
    res.status(400).json(err('CATEGORY_REQUIRED', 'A post needs at least one category to be published.', 400))
    return
  }

  const categories = await resolveCategoryIds(auth.supabase, categorySlugs)
  if (!categories.ok) {
    res.status(categories.status).json(err(categories.status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR', categories.message, categories.status))
    return
  }

  const publishStamp = parsed.value.published === true && parsed.value.published_at === undefined
    ? { published_at: new Date().toISOString() }
    : {}

  const inserted = await auth.supabase
    .from('blog_posts')
    .insert({
      author_name: DEFAULT_AUTHOR_NAME,
      ...parsed.value,
      ...publishStamp,
      author_id: auth.user.id,
    })
    .select('id')
    .single()

  if (inserted.error !== null) {
    const duplicate = (inserted.error as { code?: string }).code === DUPLICATE_KEY
    res.status(duplicate ? 409 : 500).json(
      duplicate
        ? err('SLUG_TAKEN', 'A post with that slug already exists.', 409)
        : err('INTERNAL_ERROR', 'Failed to create post.', 500),
    )
    return
  }

  const { id } = inserted.data as { id: string }

  if (categories.ids.length > 0) {
    const saved = await auth.supabase.rpc('replace_blog_post_categories', {
      p_post_id: id,
      p_category_ids: categories.ids,
    })
    if (saved.error !== null) {
      await auth.supabase.from('blog_posts').delete().eq('id', id)
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to save post categories.', 500))
      return
    }
  }

  const { data, error } = await auth.supabase
    .from('blog_posts')
    .select(ADMIN_POST_COLUMNS)
    .eq('id', id)
    .single()

  if (error !== null || !isPostRow(data)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Post was created but could not be loaded.', 500))
    return
  }

  res.status(201).json(ok(toAdminPost(data)))
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
