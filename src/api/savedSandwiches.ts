type SavedSandwich = {
  id: string
  name: string
  composition: Record<string, unknown[]>
  total_estimated_cost: Record<string, number> | null
  total_nutrition: Record<string, number> | null
  rating: number | null
  is_favorite: boolean
  created_at: string
}

type SaveResponse = {
  data: { id: string; name: string; rating: number | null; is_favorite: boolean; created_at: string }
}

type ListResponse = {
  data: SavedSandwich[]
  meta: { count: number; total: number; limit: number; offset: number }
}

type UpdateResponse = {
  data: { id: string; rating: number | null; is_favorite: boolean; updated_at: string }
}

type ClearResponse = {
  data: { deleted_count: number }
}

const authHeaders = (token: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

export const saveSandwich = async (
  token: string,
  params: {
    composition: Record<string, unknown[]>
    name: string
    total_estimated_cost?: Record<string, number> | null
    total_nutrition?: Record<string, number> | null
  },
): Promise<SaveResponse['data']> => {
  const response = await fetch(
    new URL('/api/sandwiches/saved', window.location.origin).toString(),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(params),
    },
  )
  if (!response.ok) throw new Error(`Failed to save sandwich: ${String(response.status)}`)
  return ((await response.json()) as SaveResponse).data
}

export const fetchSavedSandwiches = async (
  token: string,
  params: {
    q?: string
    rating?: number
    favorites_only?: boolean
    sort?: string
    limit?: number
    offset?: number
  } = {},
): Promise<ListResponse> => {
  const url = new URL('/api/sandwiches/saved', window.location.origin)
  if (params.q !== undefined) url.searchParams.set('q', params.q)
  if (params.rating !== undefined) url.searchParams.set('rating', String(params.rating))
  if (params.favorites_only === true) url.searchParams.set('favorites_only', 'true')
  if (params.sort !== undefined) url.searchParams.set('sort', params.sort)
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset))

  const response = await fetch(url.toString(), { headers: authHeaders(token) })
  if (!response.ok) throw new Error(`Failed to fetch history: ${String(response.status)}`)
  return (await response.json()) as ListResponse
}

export const updateSavedSandwich = async (
  token: string,
  id: string,
  updates: { rating?: number | null; is_favorite?: boolean },
): Promise<UpdateResponse['data']> => {
  const response = await fetch(
    new URL(`/api/sandwiches/saved/${id}`, window.location.origin).toString(),
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(updates),
    },
  )
  if (!response.ok) throw new Error(`Failed to update sandwich: ${String(response.status)}`)
  return ((await response.json()) as UpdateResponse).data
}

export const deleteSavedSandwich = async (token: string, id: string): Promise<void> => {
  const response = await fetch(
    new URL(`/api/sandwiches/saved/${id}`, window.location.origin).toString(),
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  )
  if (!response.ok) throw new Error(`Failed to delete sandwich: ${String(response.status)}`)
}

export const clearSavedSandwiches = async (
  token: string,
  includeFavorites: boolean,
): Promise<number> => {
  const response = await fetch(
    new URL('/api/sandwiches/saved', window.location.origin).toString(),
    {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({ confirm: true, include_favorites: includeFavorites }),
    },
  )
  if (!response.ok) throw new Error(`Failed to clear history: ${String(response.status)}`)
  return ((await response.json()) as ClearResponse).data.deleted_count
}

export type { SavedSandwich }
