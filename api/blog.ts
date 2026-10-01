import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'
import { isSlug } from './_lib/slug.js'
import { setPublicCache } from './_lib/publicCache.js'
import { isPostRow, withCategories } from './_lib/blogPostColumns.js'
import { LIST_POST_COLUMNS, nowIso } from './_lib/blogPublic.js'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

const firstString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseInteger = (value: string | undefined, fallback: number): number | null => {
  if (value === undefined) return fallback
  return /^\d+$/.test(value) ? Number(value) : null
}

const invalid = (res: VercelResponse, message: string): void => {
  res.status(400).json(err('INVALID_INPUT', message, 400))
}

const failed = (res: VercelResponse): void => {
  res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch posts.', 500))
}

type PostIds = { ok: true; ids: string[] } | { ok: false; status: 400 | 500 }

const postIdsInCategory = async (slug: string): Promise<PostIds> => {
  const category = await supabase.from('blog_categories').select('id').eq('slug', slug).maybeSingle()
  if (category.error !== null) return { ok: false, status: 500 }
  if (category.data === null) return { ok: false, status: 400 }

  const links = await supabase
    .from('blog_post_categories')
    .select('post_id')
    .eq('category_id', (category.data as { id: string }).id)
  if (links.error !== null) return { ok: false, status: 500 }

  return { ok: true, ids: (links.data as { post_id: string }[]).map((link) => link.post_id) }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const limit = parseInteger(firstString(req.query.limit), DEFAULT_LIMIT)
  if (limit === null || limit < 1 || limit > MAX_LIMIT) {
    invalid(res, `limit must be an integer between 1 and ${String(MAX_LIMIT)}.`)
    return
  }

  const offset = parseInteger(firstString(req.query.offset), 0)
  if (offset === null) {
    invalid(res, 'offset must be a non-negative integer.')
    return
  }

  const category = firstString(req.query.category)
  if (category !== undefined && !isSlug(category)) {
    invalid(res, 'category is not a recognised category.')
    return
  }

  const search = firstString(req.query.q)?.trim()

  const inCategory = category === undefined ? undefined : await postIdsInCategory(category)
  if (inCategory?.ok === false) {
    if (inCategory.status === 400) invalid(res, 'category is not a recognised category.')
    else failed(res)
    return
  }

  if (inCategory?.ids.length === 0) {
    setPublicCache(res)
    res.status(200).json(ok([], { total_count: 0, limit, offset }))
    return
  }

  const base = supabase
    .from('blog_posts')
    .select(LIST_POST_COLUMNS, { count: 'exact' })
    .eq('published', true)
    .lte('published_at', nowIso())

  const filtered = [
    (query: typeof base) => (inCategory === undefined ? query : query.in('id', inCategory.ids)),
    (query: typeof base) =>
      search === undefined || search === ''
        ? query
        : query.textSearch('search_vector', search, { type: 'websearch', config: 'english' }),
  ].reduce((query, apply) => apply(query), base)

  const { data, count, error } = await filtered
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error !== null) {
    failed(res)
    return
  }

  setPublicCache(res)
  res.status(200).json(ok((data as unknown[]).filter(isPostRow).map(withCategories), {
    total_count: count ?? 0,
    limit,
    offset,
  }))
}
