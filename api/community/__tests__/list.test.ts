import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({ supabase: { rpc: mockRpc } }))

import handler from '../../community.js'
import { dataOf, errorOf, makeReq, makeRes, metaOf } from '../../_lib/__tests__/supabaseMock.js'

const row = (name: string, rank: number) => ({
  id: `id-${name}`,
  slug: `${name}-abc12345`,
  name,
  fun_name: null,
  composition: { bread: [{ slug: 'rye', name: 'Rye' }] },
  dietary_tags: [],
  generated_count: 4,
  avg_rating: 4.5,
  rating_count: 2,
  created_at: '2026-10-01T12:00:00Z',
  rank,
  total_count: 30,
})

const list = async (query: Record<string, string> = {}, method = 'GET') => {
  const res = makeRes()
  await handler(makeReq({ method, query }), res)
  return res
}

const rpcArgs = (): Record<string, unknown> => mockRpc.mock.calls[0][1] as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  mockRpc.mockResolvedValue({ data: [row('turkey', 1), row('ham', 2)], error: null })
})

describe('GET /api/community', () => {
  it('lists the most popular sandwiches, 24 at a time, by default', async () => {
    const res = await list()

    expect(res._status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('community_leaderboard', {
      p_sort: 'most_popular',
      p_require: [],
      p_avoid: [],
      p_ingredient: null,
      p_limit: 24,
      p_offset: 0,
    })
  })

  it('returns each sandwich with its rank and the overall total', async () => {
    const res = await list()

    const data = dataOf(res) as Record<string, unknown>[]
    expect(data.map((item) => [item.name, item.rank])).toEqual([['turkey', 1], ['ham', 2]])
    expect(data[0]).not.toHaveProperty('total_count')
    expect(metaOf(res)).toMatchObject({ total_count: 30, limit: 24, offset: 0 })
  })

  it('reports a total of zero when nothing matches', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = await list()

    expect(dataOf(res)).toEqual([])
    expect(metaOf(res).total_count).toBe(0)
  })

  it.each(['top_rated', 'most_popular', 'trending', 'newest'])('sorts by %s', async (sort) => {
    await list({ sort })

    expect(rpcArgs().p_sort).toBe(sort)
  })

  it('rejects an unknown sort', async () => {
    const res = await list({ sort: 'loudest' })

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('INVALID_INPUT')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('splits dietary filters into must-have and must-avoid tags', async () => {
    await list({ diet: 'vegetarian,contains_pork,gluten_free' })

    expect(rpcArgs()).toMatchObject({ p_require: ['vegetarian', 'gluten_free'], p_avoid: ['contains_pork'] })
  })

  it('rejects an unknown dietary tag', async () => {
    const res = await list({ diet: 'keto' })

    expect(res._status).toBe(400)
  })

  it('filters by an ingredient', async () => {
    await list({ ingredient: 'corned-beef' })

    expect(rpcArgs().p_ingredient).toBe('corned-beef')
  })

  it('rejects an ingredient that is not a slug', async () => {
    const res = await list({ ingredient: 'Corned Beef' })

    expect(res._status).toBe(400)
  })

  it('pages through the results', async () => {
    await list({ limit: '12', offset: '24' })

    expect(rpcArgs()).toMatchObject({ p_limit: 12, p_offset: 24 })
  })

  it.each<Record<string, string>>([{ limit: '0' }, { limit: '51' }, { limit: 'many' }, { offset: '-1' }])('rejects paging of %j', async (query) => {
    const res = await list(query)

    expect(res._status).toBe(400)
  })

  it('lets the list be cached briefly', async () => {
    const res = await list()

    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('fails clearly when the leaderboard cannot be loaded', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await list()

    expect(res._status).toBe(500)
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('only answers GET requests', async () => {
    const res = await list({}, 'POST')

    expect(res._status).toBe(405)
  })
})
