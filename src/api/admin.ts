import type { CompatGroup } from '@/types'

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

const request = async <T>(token: string, path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(new URL(path, window.location.origin).toString(), {
    ...init,
    headers: authHeaders(token),
  })
  if (!response.ok) throw new Error(`Admin request failed: ${String(response.status)}`)
  return ((await response.json()) as { data: T }).data
}

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
