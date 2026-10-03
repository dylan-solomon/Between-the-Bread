import type { CommunityComposition } from './community'

export type SearchSource = 'database' | 'community' | 'blog' | 'saved'

export type SearchTab = 'all' | SearchSource

type Rated = { avg_rating: number | null; rating_count: number }

export type SearchResult =
  | {
      source: 'database'
      slug: string
      title: string
      details: Rated & {
        description: string | null
        image_url: string | null
        origin_country: string | null
        alternative_names: string[]
        dietary_tags: string[]
      }
    }
  | {
      source: 'community'
      slug: string
      title: string
      details: Rated & {
        fun_name: string | null
        composition: CommunityComposition
        dietary_tags: string[]
        generated_count: number
      }
    }
  | {
      source: 'blog'
      slug: string
      title: string
      details: { excerpt: string; cover_image_url: string | null; published_at: string; reading_time_minutes: number }
    }
  | {
      source: 'saved'
      slug: string
      title: string
      details: { composition: CommunityComposition; rating: number | null; is_favorite: boolean; created_at: string }
    }

export type SearchCounts = { database: number; community: number; blog: number; saved: number | null }

export type SearchPage = { items: SearchResult[]; counts: SearchCounts; totalCount: number }

export type SearchQuery = {
  q: string
  source?: SearchTab
  diet?: string[]
  limit?: number
  offset?: number
  token?: string
}

export const searchSite = async ({ token, ...query }: SearchQuery): Promise<SearchPage> => {
  const url = new URL('/api/search', window.location.origin)
  const params: [string, string | undefined][] = [
    ['q', query.q],
    ['source', query.source],
    ['diet', query.diet?.join(',')],
    ['limit', query.limit?.toString()],
    ['offset', query.offset?.toString()],
  ]
  params.forEach(([name, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(name, value)
  })

  const response = await fetch(url.toString(), {
    headers: token === undefined ? {} : { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Failed to search: ${String(response.status)}`)

  const body = (await response.json()) as { data: SearchResult[]; meta: { counts: SearchCounts; total_count: number } }
  return { items: body.data, counts: body.meta.counts, totalCount: body.meta.total_count }
}
