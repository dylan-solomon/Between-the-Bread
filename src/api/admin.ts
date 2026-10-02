import type { CompatGroup } from '@/types'
import type { Region } from '@/data/regions'

export type ConfigEntry = { key: string; value: unknown }

export type AdminIngredient = {
  id: string
  category_id: string
  name: string
  slug: string
  dietary_tags: string[]
  compat_group: string | null
  estimated_cost: Record<string, number> | null
  nutrition: Record<string, number> | null
  image_asset: string | null
  is_trigger: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export type CanonicalIngredients = Record<string, { name: string }[]>

export type AdminSandwich = {
  id: string
  name: string
  slug: string
  alternative_names: string[]
  description: string | null
  history: string | null
  origin_country: string | null
  origin_region: Region | null
  canonical_ingredients: CanonicalIngredients
  dietary_tags: string[]
  image_url: string | null
  avg_rating: number | null
  rating_count: number
  published: boolean
  created_at: string
  updated_at: string
}

export type SandwichInput = Pick<
  AdminSandwich,
  | 'name'
  | 'slug'
  | 'alternative_names'
  | 'description'
  | 'history'
  | 'origin_country'
  | 'origin_region'
  | 'canonical_ingredients'
  | 'dietary_tags'
  | 'image_url'
> & { published?: boolean }

export type AdminBlogCategory = {
  id: string
  slug: string
  name: string
  description: string | null
  display_order: number
  post_count: number
}

export type BlogCategoryInput = { name: string; description: string | null }

export type AdminBlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  cover_image_url: string | null
  related_sandwich_slugs: string[]
  author_name: string
  meta_description: string | null
  reading_time_minutes: number
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  categories: { slug: string; name: string }[]
}

export type BlogPostInput = {
  title: string
  slug: string
  excerpt: string
  body: string
  cover_image_url: string | null
  meta_description: string | null
  author_name: string
  related_sandwich_slugs: string[]
  published: boolean
  published_at?: string | null
  category_slugs: string[]
}

export type ModerationComment = {
  id: string
  user_id: string
  target_type: string
  target_id: string
  parent_id: string | null
  body: string
  is_flagged: boolean
  is_approved: boolean
  created_at: string
}

export type ModerationPhoto = {
  id: string
  user_id: string
  target_type: string
  target_id: string
  storage_path: string
  caption: string | null
  is_approved: boolean
  created_at: string
}

export type ModerationResource = 'comments' | 'photos'

export type DashboardMetrics = {
  total_users: number
  total_saved_sandwiches: number
  total_shared_links: number
  total_ratings: number
  pending_moderation_count: number
}

const authHeaders = (token: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

type ErrorDetails = { code?: string; detail?: string }

const readErrorDetails = async (response: Response): Promise<ErrorDetails> => {
  try {
    const body = (await response.json()) as { error?: { code?: unknown; message?: unknown } }
    return {
      ...(typeof body.error?.code === 'string' ? { code: body.error.code } : {}),
      ...(typeof body.error?.message === 'string' ? { detail: body.error.message } : {}),
    }
  } catch {
    return {}
  }
}

const requestWithMeta = async (token: string, path: string, init: RequestInit = {}): Promise<{ data: unknown; meta: unknown }> => {
  const response = await fetch(new URL(path, window.location.origin).toString(), {
    ...init,
    headers: authHeaders(token),
  })
  if (!response.ok) {
    throw Object.assign(new Error(`Admin request failed: ${String(response.status)}`), await readErrorDetails(response))
  }
  return (await response.json()) as { data: unknown; meta: unknown }
}

const request = async <T>(token: string, path: string, init: RequestInit = {}): Promise<T> =>
  (await requestWithMeta(token, path, init)).data as T

export const fetchConfig = (token: string): Promise<ConfigEntry[]> =>
  request(token, '/api/admin/config')

export const updateConfig = (token: string, key: string, value: unknown): Promise<ConfigEntry> =>
  request(token, '/api/admin/config', { method: 'PATCH', body: JSON.stringify({ key, value }) })

export const fetchAdminIngredients = (token: string): Promise<AdminIngredient[]> =>
  request(token, '/api/admin/ingredients')

export const createIngredient = (
  token: string,
  body: Partial<AdminIngredient> & { category_id: string; name: string; slug: string },
): Promise<AdminIngredient> =>
  request(token, '/api/admin/ingredients', { method: 'POST', body: JSON.stringify(body) })

export const updateIngredient = (
  token: string,
  id: string,
  updates: Partial<AdminIngredient>,
): Promise<AdminIngredient> =>
  request(token, `/api/admin/ingredients/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const moveIngredientCategory = async (
  token: string,
  id: string,
  categoryId: string,
): Promise<{ ingredient: AdminIngredient; entriesUpdated: number }> => {
  const { data, meta } = await requestWithMeta(
    token,
    `/api/admin/ingredients/${id}`,
    { method: 'PATCH', body: JSON.stringify({ category_id: categoryId }) },
  )
  return { ingredient: data as AdminIngredient, entriesUpdated: (meta as { entries_updated: number }).entries_updated }
}

export const updateCompatMatrix = (
  token: string,
  params: { group_a: CompatGroup; group_b: CompatGroup; affinity: number },
): Promise<{ group_a: string; group_b: string; affinity: number }> =>
  request(token, '/api/admin/compat-matrix', { method: 'PATCH', body: JSON.stringify(params) })

export const fetchModerationQueue = <T extends ModerationComment[] | ModerationPhoto[]>(
  token: string,
  resource: ModerationResource,
): Promise<T> =>
  request(token, `/api/admin/moderation/${resource}`)

export const moderateItem = (
  token: string,
  resource: ModerationResource,
  id: string,
  action: 'approve' | 'reject',
): Promise<unknown> =>
  request(token, `/api/admin/moderation/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) })

export const fetchDashboardMetrics = (token: string): Promise<DashboardMetrics> =>
  request(token, '/api/admin/dashboard')

export const fetchAdminSandwiches = (token: string): Promise<AdminSandwich[]> =>
  request(token, '/api/admin/database')

export const createSandwich = (token: string, body: SandwichInput): Promise<AdminSandwich> =>
  request(token, '/api/admin/database', { method: 'POST', body: JSON.stringify(body) })

export const updateSandwich = (
  token: string,
  slug: string,
  updates: Partial<SandwichInput>,
): Promise<AdminSandwich> =>
  request(token, `/api/admin/database/${slug}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteSandwich = (token: string, slug: string): Promise<{ slug: string; deleted: boolean }> =>
  request(token, `/api/admin/database/${slug}?permanent=true`, { method: 'DELETE' })

export const fetchBlogCategories = (token: string): Promise<AdminBlogCategory[]> =>
  request(token, '/api/admin/blog/categories')

export const createBlogCategory = (token: string, body: BlogCategoryInput): Promise<AdminBlogCategory> =>
  request(token, '/api/admin/blog/categories', { method: 'POST', body: JSON.stringify(body) })

export const updateBlogCategory = (
  token: string,
  slug: string,
  updates: Partial<BlogCategoryInput> & { display_order?: number },
): Promise<AdminBlogCategory> =>
  request(token, `/api/admin/blog/categories/${slug}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deleteBlogCategory = (token: string, slug: string): Promise<{ slug: string; deleted: boolean }> =>
  request(token, `/api/admin/blog/categories/${slug}`, { method: 'DELETE' })

export const fetchAdminPosts = (token: string): Promise<AdminBlogPost[]> =>
  request(token, '/api/admin/blog')

export const createPost = (token: string, body: BlogPostInput): Promise<AdminBlogPost> =>
  request(token, '/api/admin/blog', { method: 'POST', body: JSON.stringify(body) })

export const updatePost = (
  token: string,
  slug: string,
  updates: Partial<BlogPostInput>,
): Promise<AdminBlogPost> =>
  request(token, `/api/admin/blog/${slug}`, { method: 'PATCH', body: JSON.stringify(updates) })

export const deletePost = (token: string, slug: string): Promise<{ slug: string; deleted: boolean }> =>
  request(token, `/api/admin/blog/${slug}?permanent=true`, { method: 'DELETE' })
