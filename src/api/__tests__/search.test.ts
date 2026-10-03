import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchSite } from '@/api/search'

const respondWith = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  vi.mocked(fetch).mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

const requested = (): { url: URL; init: RequestInit | undefined } => {
  const [input, init] = vi.mocked(fetch).mock.calls[0]
  return { url: new URL(typeof input === 'string' ? input : ''), init }
}

const counts = { database: 1, community: 0, blog: 2, saved: null }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', { value: { origin: 'https://betweenbread.co' }, configurable: true })
})

describe('searchSite', () => {
  it('asks for a page of results for a tab', async () => {
    respondWith({ data: [], meta: { counts, total_count: 3 } })

    await searchSite({ q: 'reuben', source: 'blog', diet: ['vegan', 'contains_pork'], limit: 20, offset: 40 })

    const { url } = requested()
    expect(url.pathname).toBe('/api/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'reuben',
      source: 'blog',
      diet: 'vegan,contains_pork',
      limit: '20',
      offset: '40',
    })
  })

  it('leaves out the options that were not given', async () => {
    respondWith({ data: [], meta: { counts, total_count: 0 } })

    await searchSite({ q: 'reuben', diet: [] })

    expect(Object.fromEntries(requested().url.searchParams)).toEqual({ q: 'reuben' })
  })

  it('searches as the signed-in person when given their token', async () => {
    respondWith({ data: [], meta: { counts, total_count: 0 } })

    await searchSite({ q: 'reuben', token: 'token-abc' })

    expect(requested().init).toEqual({ headers: { Authorization: 'Bearer token-abc' } })
  })

  it('searches anonymously without a token', async () => {
    respondWith({ data: [], meta: { counts, total_count: 0 } })

    await searchSite({ q: 'reuben' })

    expect(requested().init).toEqual({ headers: {} })
  })

  it('returns the results, the counts per tab and the total', async () => {
    const result = { source: 'database', slug: 'reuben', title: 'Reuben', details: {} }
    respondWith({ data: [result], meta: { counts, total_count: 3 } })

    await expect(searchSite({ q: 'reuben' })).resolves.toEqual({ items: [result], counts, totalCount: 3 })
  })

  it('fails when the search cannot run', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(searchSite({ q: 'reuben' })).rejects.toThrow()
  })
})
