import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSandwich, fetchSandwiches } from '@/api/database'

const makeOkResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: vi.fn().mockResolvedValue(body) }) as unknown as Response

const makeErrResponse = (status: number) =>
  ({ ok: false, status }) as unknown as Response

const listItem = { name: 'Reuben', slug: 'reuben' }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://betweenbread.co' },
    configurable: true,
  })
})

const requestedUrl = (): URL => new URL(vi.mocked(fetch).mock.calls[0]?.[0] as string)

describe('fetchSandwiches', () => {
  it('returns the items with the total count', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: [listItem], meta: { total_count: 57 } }))

    const result = await fetchSandwiches({})

    expect(result).toEqual({ items: [listItem], totalCount: 57 })
  })

  it('requests /api/database with only the parameters provided', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: [], meta: { total_count: 0 } }))

    await fetchSandwiches({ q: 'corned beef', region: 'Europe', sort: 'rating', offset: 24, limit: 24 })

    const url = requestedUrl()
    expect(url.pathname).toBe('/api/database')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'corned beef',
      region: 'Europe',
      sort: 'rating',
      offset: '24',
      limit: '24',
    })
  })

  it('joins dietary tags into one comma separated parameter', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: [], meta: { total_count: 0 } }))

    await fetchSandwiches({ diet: ['vegan', 'gluten_free'] })

    expect(requestedUrl().searchParams.get('diet')).toBe('vegan,gluten_free')
  })

  it('omits empty search and dietary parameters', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: [], meta: { total_count: 0 } }))

    await fetchSandwiches({ q: '', diet: [] })

    expect(requestedUrl().search).toBe('')
  })

  it('throws when the request fails', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrResponse(500))

    await expect(fetchSandwiches({})).rejects.toThrow()
  })
})

describe('fetchSandwich', () => {
  it('returns the entry for a slug', async () => {
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: { id: 's1', slug: 'reuben' } }))

    const result = await fetchSandwich('reuben')

    expect(requestedUrl().pathname).toBe('/api/database/reuben')
    expect(result).toEqual({ id: 's1', slug: 'reuben' })
  })

  it('returns null when the entry does not exist', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrResponse(404))

    expect(await fetchSandwich('nope')).toBeNull()
  })

  it('throws on other failures', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrResponse(500))

    await expect(fetchSandwich('reuben')).rejects.toThrow()
  })
})
