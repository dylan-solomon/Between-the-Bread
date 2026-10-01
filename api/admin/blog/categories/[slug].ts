import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../../_lib/response.js'
import { authenticateAdminRequest } from '../../../_lib/adminAuth.js'
import type { AdminAuthResult } from '../../../_lib/adminAuth.js'
import { ADMIN_CATEGORY_COLUMNS, toAdminCategory } from '../../../_lib/blogCategoryColumns.js'
import { parseBlogCategoryInput } from '../../../_lib/blogCategoryInput.js'

const FOREIGN_KEY_VIOLATION = '23503'
const NO_ROWS = 'PGRST116'

const handlePatch = async (
  req: VercelRequest,
  res: VercelResponse,
  auth: AdminAuthResult,
  slug: string,
): Promise<void> => {
  const parsed = parseBlogCategoryInput(req.body, 'update')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  const { data, error } = await auth.supabase
    .from('blog_categories')
    .update(parsed.value)
    .eq('slug', slug)
    .select(ADMIN_CATEGORY_COLUMNS)
    .single()

  if (error === null) {
    res.status(200).json(ok(toAdminCategory(data as Parameters<typeof toAdminCategory>[0])))
    return
  }

  if ((error as { code?: string }).code === NO_ROWS) {
    res.status(404).json(err('CATEGORY_NOT_FOUND', 'Category not found.', 404))
    return
  }
  res.status(500).json(err('INTERNAL_ERROR', 'Failed to update category.', 500))
}

const handleDelete = async (
  res: VercelResponse,
  auth: AdminAuthResult,
  slug: string,
): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('blog_categories')
    .delete()
    .eq('slug', slug)
    .select('slug')

  if (error !== null) {
    const inUse = (error as { code?: string }).code === FOREIGN_KEY_VIOLATION
    res.status(inUse ? 409 : 500).json(
      inUse
        ? err('CATEGORY_IN_USE', 'Remove the category from its posts before deleting it.', 409)
        : err('INTERNAL_ERROR', 'Failed to delete category.', 500),
    )
    return
  }

  if ((data as unknown[]).length === 0) {
    res.status(404).json(err('CATEGORY_NOT_FOUND', 'Category not found.', 404))
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
    await handleDelete(res, auth, slug)
    return
  }

  await handlePatch(req, res, auth, slug)
}
