import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../_lib/adminAuth.js'
import { ADMIN_CATEGORY_COLUMNS, toAdminCategory } from '../../_lib/blogCategoryColumns.js'
import { parseBlogCategoryInput } from '../../_lib/blogCategoryInput.js'

const DUPLICATE_KEY = '23505'

const handleGet = async (res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('blog_categories')
    .select(ADMIN_CATEGORY_COLUMNS)
    .order('display_order')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch categories.', 500))
    return
  }

  res.status(200).json(ok((data as Parameters<typeof toAdminCategory>[0][]).map(toAdminCategory)))
}

const nextDisplayOrder = async (auth: AdminAuthResult): Promise<number | null> => {
  const { data, error } = await auth.supabase
    .from('blog_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)

  if (error !== null) return null
  const [last] = data as { display_order: number }[]
  return data.length === 0 ? 1 : last.display_order + 1
}

const handlePost = async (req: VercelRequest, res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const parsed = parseBlogCategoryInput(req.body, 'create')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  const displayOrder = parsed.value.display_order === undefined ? await nextDisplayOrder(auth) : parsed.value.display_order
  if (displayOrder === null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to create category.', 500))
    return
  }

  const { data, error } = await auth.supabase
    .from('blog_categories')
    .insert({ ...parsed.value, display_order: displayOrder })
    .select(ADMIN_CATEGORY_COLUMNS)
    .single()

  if (error !== null) {
    const duplicate = (error as { code?: string }).code === DUPLICATE_KEY
    res.status(duplicate ? 409 : 500).json(
      duplicate
        ? err('SLUG_TAKEN', 'A category with that slug already exists.', 409)
        : err('INTERNAL_ERROR', 'Failed to create category.', 500),
    )
    return
  }

  res.status(201).json(ok(toAdminCategory(data as Parameters<typeof toAdminCategory>[0])))
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
