import type { Region } from '@/data/regions'

export type SandwichSort = 'name' | 'rating' | 'newest'

export type CanonicalIngredients = Partial<Record<string, { name: string }[]>>

export type SandwichSummary = {
  name: string
  slug: string
  alternative_names: string[]
  description: string | null
  origin_country: string | null
  origin_region: Region | null
  image_url: string | null
  avg_rating: number | null
  rating_count: number
  dietary_tags: string[]
  canonical_ingredients: CanonicalIngredients
}

export type BlogPostPreview = {
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string
  reading_time_minutes: number
}

export type SandwichEntry = SandwichSummary & {
  id: string
  history: string | null
  comment_count: number
  photo_count: number
  blog_posts: BlogPostPreview[]
}

export type SandwichQuery = {
  q?: string
  region?: Region
  diet?: string[]
  sort?: SandwichSort
  limit?: number
  offset?: number
}

type SandwichPage = { items: SandwichSummary[]; totalCount: number }

const endpoint = (path: string): URL => new URL(path, window.location.origin)

export const fetchSandwiches = async (query: SandwichQuery): Promise<SandwichPage> => {
  const url = endpoint('/api/database')
  const params: [string, string | undefined][] = [
    ['q', query.q],
    ['region', query.region],
    ['diet', query.diet?.join(',')],
    ['sort', query.sort],
    ['limit', query.limit?.toString()],
    ['offset', query.offset?.toString()],
  ]
  params.forEach(([name, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(name, value)
  })

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch sandwiches: ${String(response.status)}`)

  const body = (await response.json()) as { data: SandwichSummary[]; meta: { total_count: number } }
  return { items: body.data, totalCount: body.meta.total_count }
}

export const fetchSandwich = async (slug: string): Promise<SandwichEntry | null> => {
  const response = await fetch(endpoint(`/api/database/${encodeURIComponent(slug)}`).toString())
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to fetch sandwich: ${String(response.status)}`)

  return ((await response.json()) as { data: SandwichEntry }).data
}
