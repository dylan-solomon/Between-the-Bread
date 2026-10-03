import { hasFields } from '../utils/hasFields'

export type CommunitySort = 'top_rated' | 'most_popular' | 'trending' | 'newest'

export type CommunityIngredient = { slug: string; name: string }

export type CommunityComposition = Partial<Record<string, CommunityIngredient[]>>

export type CommunitySandwichSummary = {
  id: string
  slug: string
  name: string
  fun_name: string | null
  composition: CommunityComposition
  dietary_tags: string[]
  generated_count: number
  avg_rating: number | null
  rating_count: number
  created_at: string
  rank: number
}

export type CommunityMaker = { username: string; is_admin: boolean }

export type CommunitySandwich = Omit<CommunitySandwichSummary, 'rank'> & {
  comment_count: number
  photo_count: number
  first_made_by: CommunityMaker | null
}

export const isCommunitySandwich = (value: unknown): value is CommunitySandwich =>
  hasFields(value, {
    id: 'string',
    slug: 'string',
    name: 'string',
    composition: 'object',
    dietary_tags: 'array',
    generated_count: 'number',
    rating_count: 'number',
    created_at: 'string',
  })

export type CommunityQuery = {
  sort?: CommunitySort
  diet?: string[]
  ingredient?: string
  limit?: number
  offset?: number
}

export type CommunityPage = { items: CommunitySandwichSummary[]; totalCount: number }

export const isCommunityPage = (value: unknown): value is CommunityPage =>
  hasFields(value, { items: 'array', totalCount: 'number' })

const endpoint = (path: string): URL => new URL(path, window.location.origin)

export const fetchCommunityLeaderboard = async (query: CommunityQuery): Promise<CommunityPage> => {
  const url = endpoint('/api/community')
  const params: [string, string | undefined][] = [
    ['sort', query.sort],
    ['diet', query.diet?.join(',')],
    ['ingredient', query.ingredient],
    ['limit', query.limit?.toString()],
    ['offset', query.offset?.toString()],
  ]
  params.forEach(([name, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(name, value)
  })

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch the leaderboard: ${String(response.status)}`)

  const body = (await response.json()) as { data: CommunitySandwichSummary[]; meta: { total_count: number } }
  return { items: body.data, totalCount: body.meta.total_count }
}

export const fetchCommunitySandwich = async (slug: string): Promise<CommunitySandwich | null> => {
  const response = await fetch(endpoint(`/api/community/${encodeURIComponent(slug)}`).toString())
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to fetch community sandwich: ${String(response.status)}`)

  const body = (await response.json()) as { data?: unknown }
  if (!isCommunitySandwich(body.data)) throw new Error('Unexpected community sandwich answer.')
  return body.data
}
