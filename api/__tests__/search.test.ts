import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPublicRpc, mockUserRpc, mockCreateClient } = vi.hoisted(() => ({
  mockPublicRpc: vi.fn(),
  mockUserRpc: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('../_lib/supabase.js', () => ({ supabase: { rpc: mockPublicRpc } }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }))

import handler from '../search.js'
import { dataOf, errorOf, makeReq, makeRes, metaOf } from '../_lib/__tests__/supabaseMock.js'

type Hit = { source: string; slug: string; title: string; score: number; details: Record<string, unknown> }

const hit = (source: string, title: string, score: number): Hit => ({
  source,
  slug: title.toLowerCase().replace(/ /g, '-'),
  title,
  score,
  details: {},
})

const publicAnswer = (results: Hit[], counts = { database: 2, community: 1, blog: 1 }) => ({
  data: { results, counts },
  error: null,
})

const savedAnswer = (results: Hit[], count = results.length) => ({ data: { results, count }, error: null })

const search = async (query: Record<string, string>, headers: Record<string, string> = {}) => {
  const res = makeRes()
  await handler(makeReq({ method: 'GET', query, headers }), res)
  return res
}

const signedIn = { authorization: 'Bearer user-token' }

const publicArgs = (): Record<string, unknown> => mockPublicRpc.mock.calls[0][1] as Record<string, unknown>
const savedArgs = (): Record<string, unknown> => mockUserRpc.mock.calls[0][1] as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  mockCreateClient.mockReturnValue({ rpc: mockUserRpc })
  mockPublicRpc.mockResolvedValue(publicAnswer([hit('database', 'Reuben', 3.2), hit('blog', 'Best Reuben Variations', 2.1)]))
  mockUserRpc.mockResolvedValue(savedAnswer([hit('saved', 'My Reuben', 2.5)]))
})

describe('GET /api/search for visitors', () => {
  it('searches everything public, 20 results at a time', async () => {
    const res = await search({ q: 'reuben' })

    expect(res._status).toBe(200)
    expect(mockPublicRpc).toHaveBeenCalledWith('search_public', {
      p_query: 'reuben',
      p_source: 'all',
      p_require: [],
      p_avoid: [],
      p_limit: 20,
      p_offset: 0,
    })
    expect((dataOf(res) as Hit[]).map((item) => item.title)).toEqual(['Reuben', 'Best Reuben Variations'])
  })

  it('reports how many results each tab has, with no history tab for visitors', async () => {
    const res = await search({ q: 'reuben' })

    expect(metaOf(res)).toMatchObject({
      counts: { database: 2, community: 1, blog: 1, saved: null },
      total_count: 4,
      limit: 20,
      offset: 0,
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('does not send the internal ranking score', async () => {
    const res = await search({ q: 'reuben' })

    expect((dataOf(res) as Record<string, unknown>[])[0]).not.toHaveProperty('score')
  })

  it('lets visitor searches be cached briefly', async () => {
    const res = await search({ q: 'reuben' })

    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it.each(['database', 'community', 'blog'])('searches only the %s tab when asked', async (source) => {
    const res = await search({ q: 'reuben', source })

    expect(publicArgs().p_source).toBe(source)
    expect(metaOf(res).total_count).toBe({ database: 2, community: 1, blog: 1 }[source])
  })

  it('asks a visitor to sign in to search their history', async () => {
    const res = await search({ q: 'reuben', source: 'saved' })

    expect(res._status).toBe(401)
    expect(errorOf(res).code).toBe('AUTH_REQUIRED')
  })

  it('splits dietary filters into must-have and must-avoid tags', async () => {
    await search({ q: 'ham', diet: 'vegetarian,contains_pork' })

    expect(publicArgs()).toMatchObject({ p_require: ['vegetarian'], p_avoid: ['contains_pork'] })
  })

  it('trims the search words', async () => {
    await search({ q: '  reuben  ' })

    expect(publicArgs().p_query).toBe('reuben')
  })

  it.each([
    [{ q: 'r' }],
    [{ q: '  ' }],
    [{}],
    [{ q: 'reuben', source: 'everything' }],
    [{ q: 'reuben', diet: 'keto' }],
    [{ q: 'reuben', limit: '0' }],
    [{ q: 'reuben', limit: '51' }],
    [{ q: 'reuben', offset: '-2' }],
    [{ q: 'a'.repeat(101) }],
  ])('rejects %j', async (query) => {
    const res = await search(query as Record<string, string>)

    expect(res._status).toBe(400)
    expect(mockPublicRpc).not.toHaveBeenCalled()
  })

  it('fails clearly when the search cannot run', async () => {
    mockPublicRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await search({ q: 'reuben' })

    expect(res._status).toBe(500)
  })

  it('only answers GET requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'POST', query: { q: 'reuben' } }), res)

    expect(res._status).toBe(405)
  })
})

describe('GET /api/search for signed-in people', () => {
  it('searches their history as them', async () => {
    await search({ q: 'reuben' }, signedIn)

    expect(mockCreateClient).toHaveBeenCalledWith('https://test.supabase.co', 'anon-key', {
      global: { headers: { Authorization: 'Bearer user-token' } },
    })
  })

  it('mixes their history into the results by relevance', async () => {
    const res = await search({ q: 'reuben' }, signedIn)

    expect((dataOf(res) as Hit[]).map((item) => item.title)).toEqual(['Reuben', 'My Reuben', 'Best Reuben Variations'])
    expect(metaOf(res)).toMatchObject({ counts: { database: 2, community: 1, blog: 1, saved: 1 }, total_count: 5 })
  })

  it('pages through the mixed results', async () => {
    mockPublicRpc.mockResolvedValue(publicAnswer([hit('database', 'A', 5), hit('database', 'C', 3), hit('database', 'E', 1)]))
    mockUserRpc.mockResolvedValue(savedAnswer([hit('saved', 'B', 4), hit('saved', 'D', 2)]))

    const res = await search({ q: 'abc', limit: '2', offset: '2' }, signedIn)

    expect(publicArgs()).toMatchObject({ p_limit: 4, p_offset: 0 })
    expect(savedArgs()).toEqual({ p_query: 'abc', p_limit: 4, p_offset: 0 })
    expect((dataOf(res) as Hit[]).map((item) => item.title)).toEqual(['C', 'D'])
  })

  it('searches only their history when asked, still counting the other tabs', async () => {
    const res = await search({ q: 'reuben', source: 'saved', limit: '10', offset: '10' }, signedIn)

    expect(savedArgs()).toEqual({ p_query: 'reuben', p_limit: 10, p_offset: 10 })
    expect(publicArgs()).toMatchObject({ p_source: 'all', p_limit: 0, p_offset: 0 })
    expect((dataOf(res) as Hit[]).map((item) => item.title)).toEqual(['My Reuben'])
    expect(metaOf(res)).toMatchObject({ counts: { saved: 1, database: 2 }, total_count: 1 })
  })

  it('still counts their history when another tab is chosen', async () => {
    const res = await search({ q: 'reuben', source: 'blog' }, signedIn)

    expect(savedArgs()).toMatchObject({ p_limit: 0 })
    expect(metaOf(res)).toMatchObject({ counts: { saved: 1 } })
  })

  it('leaves their history out when a dietary filter is on', async () => {
    const res = await search({ q: 'reuben', diet: 'vegan' }, signedIn)

    expect(mockUserRpc).not.toHaveBeenCalled()
    expect(metaOf(res)).toMatchObject({ counts: { saved: 0 } })
  })

  it('never lets their search be cached for anyone else', async () => {
    const res = await search({ q: 'reuben' }, signedIn)

    expect(res._headers['Cache-Control']).toBe('private, no-store')
  })

  it('still shows public results when their history cannot be searched', async () => {
    mockUserRpc.mockResolvedValue({ data: null, error: { message: 'JWT expired' } })

    const res = await search({ q: 'reuben' }, signedIn)

    expect(res._status).toBe(200)
    expect((dataOf(res) as Hit[]).map((item) => item.title)).toEqual(['Reuben', 'Best Reuben Variations'])
    expect(metaOf(res)).toMatchObject({ counts: { saved: null } })
  })
})
