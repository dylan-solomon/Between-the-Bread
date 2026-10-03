import type { SearchResult } from '@/api/search'

export const SOURCE_LABELS: Record<SearchResult['source'], string> = {
  database: 'Classic Sandwich',
  community: 'Community',
  blog: 'Blog',
  saved: 'My History',
}

export const resultLink = (result: Pick<SearchResult, 'source' | 'slug' | 'title'>): string => {
  switch (result.source) {
    case 'database':
      return `/sandwiches/${result.slug}`
    case 'community':
      return `/community/${result.slug}`
    case 'blog':
      return `/blog/${result.slug}`
    case 'saved':
      return `/account/history?${new URLSearchParams({ q: result.title }).toString()}`
  }
}

export const searchPageLink = (query: string): string => `/search?${new URLSearchParams({ q: query }).toString()}`
