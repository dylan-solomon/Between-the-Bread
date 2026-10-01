import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { setPublicCache } from '../_lib/publicCache.js'

type CategoryRow = {
  slug: string
  name: string
  description: string | null
  blog_post_categories: { count: number }[]
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { data, error } = await supabase
    .from('blog_categories')
    .select('slug, name, description, display_order, blog_post_categories(count)')
    .order('display_order')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch categories.', 500))
    return
  }

  const categories = (data as CategoryRow[]).map(({ slug, name, description, blog_post_categories: links }) => ({
    slug,
    name,
    description,
    post_count: links.reduce((total, link) => total + link.count, 0),
  }))

  setPublicCache(res)
  res.status(200).json(ok(categories))
}
