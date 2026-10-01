import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchBlogPosts, fetchPublicBlogCategories } from '@/api/blog'

const respondWith = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  vi.mocked(fetch).mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

const requestedUrl = (): URL => {
  const [input] = vi.mocked(fetch).mock.calls[0]
  return new URL(typeof input === 'string' ? input : '')
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://betweenbread.co' },
    configurable: true,
  })
})

describe('fetchBlogPosts', () => {
  it('asks for a page of posts, optionally within a category', async () => {
    respondWith({ data: [], meta: { total_count: 0 } })

    await fetchBlogPosts({ category: 'dietary', limit: 12, offset: 24 })

    const url = requestedUrl()
    expect(url.pathname).toBe('/api/blog')
    expect(url.searchParams.get('category')).toBe('dietary')
    expect(url.searchParams.get('limit')).toBe('12')
    expect(url.searchParams.get('offset')).toBe('24')
  })

  it('leaves out the options that were not given', async () => {
    respondWith({ data: [], meta: { total_count: 0 } })

    await fetchBlogPosts({})

    expect(requestedUrl().search).toBe('')
  })

  it('returns the posts with the total count', async () => {
    respondWith({ data: [{ slug: 'a' }, { slug: 'b' }], meta: { total_count: 7 } })

    await expect(fetchBlogPosts({})).resolves.toEqual({ items: [{ slug: 'a' }, { slug: 'b' }], totalCount: 7 })
  })

  it('fails when the server does', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(fetchBlogPosts({})).rejects.toThrow('500')
  })
})

describe('fetchPublicBlogCategories', () => {
  it('returns the categories with their post counts', async () => {
    respondWith({ data: [{ slug: 'dietary', name: 'Dietary', description: null, post_count: 2 }] })

    await expect(fetchPublicBlogCategories()).resolves.toEqual([
      { slug: 'dietary', name: 'Dietary', description: null, post_count: 2 },
    ])
    expect(requestedUrl().pathname).toBe('/api/blog/categories')
  })

  it('fails when the server does', async () => {
    respondWith({}, { ok: false, status: 503 })

    await expect(fetchPublicBlogCategories()).rejects.toThrow('503')
  })
})
