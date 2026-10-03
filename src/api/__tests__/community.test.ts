import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCommunityLeaderboard } from '@/api/community'

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
  Object.defineProperty(window, 'location', { value: { origin: 'https://betweenbread.co' }, configurable: true })
})

describe('fetchCommunityLeaderboard', () => {
  it('asks for a sorted, filtered page of the leaderboard', async () => {
    respondWith({ data: [], meta: { total_count: 0 } })

    await fetchCommunityLeaderboard({ sort: 'trending', diet: ['vegan', 'contains_pork'], ingredient: 'ham', limit: 24, offset: 48 })

    const url = requestedUrl()
    expect(url.pathname).toBe('/api/community')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      sort: 'trending',
      diet: 'vegan,contains_pork',
      ingredient: 'ham',
      limit: '24',
      offset: '48',
    })
  })

  it('leaves out the options that were not given', async () => {
    respondWith({ data: [], meta: { total_count: 0 } })

    await fetchCommunityLeaderboard({ diet: [] })

    expect([...requestedUrl().searchParams.keys()]).toEqual([])
  })

  it('returns the sandwiches and the overall total', async () => {
    const item = { slug: 'turkey-abc12345', name: 'Turkey', rank: 1 }
    respondWith({ data: [item], meta: { total_count: 30 } })

    await expect(fetchCommunityLeaderboard({})).resolves.toEqual({ items: [item], totalCount: 30 })
  })

  it('fails when the leaderboard cannot be loaded', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(fetchCommunityLeaderboard({})).rejects.toThrow()
  })
})
