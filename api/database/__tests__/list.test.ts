import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../../database.js'

type Call = { method: string; args: unknown[] }
type QueryResult = { data: unknown; count: number | null; error: unknown }

const makeQuery = (result: QueryResult) => {
  const calls: Call[] = []
  const builder: Record<string, unknown> = {}
  const chain = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    return builder
  }
  for (const method of ['select', 'eq', 'contains', 'not', 'textSearch', 'order', 'range']) {
    builder[method] = chain(method)
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve)
  return { builder, calls }
}

const stubRow = {
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef and sauerkraut on rye.',
  origin_country: 'United States',
  origin_region: 'Americas',
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
  dietary_tags: [],
  canonical_ingredients: { bread: [{ name: 'Rye' }] },
}

const setupQuery = (overrides: Partial<QueryResult> = {}) => {
  const query = makeQuery({ data: [stubRow], count: 1, error: null, ...overrides })
  mockFrom.mockReturnValue(query.builder)
  return query.calls
}

const makeReq = (method = 'GET', query: Record<string, string> = {}): VercelRequest =>
  ({ method, query }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

type Body = { data: unknown; meta: Record<string, unknown> }

const statusOf = (res: VercelResponse): unknown => vi.mocked(res.status).mock.calls[0]?.[0]
const bodyOf = (res: VercelResponse): Body => vi.mocked(res.json).mock.calls[0]?.[0] as Body
const callsTo = (calls: Call[], method: string) => calls.filter((c) => c.method === method)

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/database', () => {
  it('returns published sandwiches with pagination meta', async () => {
    setupQuery({ count: 57 })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(200)
    expect(bodyOf(res).data).toEqual([stubRow])
    expect(bodyOf(res).meta).toMatchObject({ total_count: 57, limit: 24, offset: 0 })
  })

  it('reads from the sandwich_database table', async () => {
    setupQuery()
    await handler(makeReq(), makeRes())
    expect(mockFrom).toHaveBeenCalledWith('sandwich_database')
  })

  it('pages through results using limit and offset', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { limit: '10', offset: '20' }), makeRes())

    expect(callsTo(calls, 'range')[0]?.args).toEqual([20, 29])
  })

  it('rejects a limit above 50', async () => {
    setupQuery()
    const res = makeRes()

    await handler(makeReq('GET', { limit: '51' }), res)

    expect(statusOf(res)).toBe(400)
  })

  it.each([['limit', '0'], ['limit', 'abc'], ['offset', '-1'], ['offset', '1.5']])(
    'rejects %s=%s',
    async (name, value) => {
      setupQuery()
      const res = makeRes()

      await handler(makeReq('GET', { [name]: value }), res)

      expect(statusOf(res)).toBe(400)
    },
  )

  it('filters by region', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { region: 'Europe' }), makeRes())

    expect(callsTo(calls, 'eq')).toContainEqual({ method: 'eq', args: ['origin_region', 'Europe'] })
  })

  it('rejects an unknown region', async () => {
    setupQuery()
    const res = makeRes()

    await handler(makeReq('GET', { region: 'Atlantis' }), res)

    expect(statusOf(res)).toBe(400)
  })

  it('filters by country', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { country: 'Italy' }), makeRes())

    expect(callsTo(calls, 'eq')).toContainEqual({ method: 'eq', args: ['origin_country', 'Italy'] })
  })

  it('filters by dietary tags requiring all of them', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { diet: 'vegan, gluten_free' }), makeRes())

    expect(callsTo(calls, 'contains')[0]?.args).toEqual(['dietary_tags', ['vegan', 'gluten_free']])
  })

  it('excludes entries carrying an avoided contains tag', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { diet: 'contains_pork,contains_shellfish' }), makeRes())

    expect(callsTo(calls, 'not').map((c) => c.args)).toEqual([
      ['dietary_tags', 'cs', '{contains_pork}'],
      ['dietary_tags', 'cs', '{contains_shellfish}'],
    ])
    expect(callsTo(calls, 'contains')).toHaveLength(0)
  })

  it('combines must-have and avoided tags', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { diet: 'pescatarian,contains_peanuts' }), makeRes())

    expect(callsTo(calls, 'contains')[0]?.args).toEqual(['dietary_tags', ['pescatarian']])
    expect(callsTo(calls, 'not')[0]?.args).toEqual(['dietary_tags', 'cs', '{contains_peanuts}'])
  })

  it('rejects an unknown dietary tag', async () => {
    setupQuery()
    const res = makeRes()

    await handler(makeReq('GET', { diet: 'vegan,keto' }), res)

    expect(statusOf(res)).toBe(400)
  })

  it('searches full text with web-style query syntax', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { q: 'corned beef' }), makeRes())

    expect(callsTo(calls, 'textSearch')[0]?.args).toEqual([
      'search_vector',
      'corned beef',
      { type: 'websearch', config: 'english' },
    ])
  })

  it('ignores a blank search query', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { q: '   ' }), makeRes())

    expect(callsTo(calls, 'textSearch')).toHaveLength(0)
  })

  it('sorts by name A-Z by default', async () => {
    const calls = setupQuery()

    await handler(makeReq(), makeRes())

    expect(callsTo(calls, 'order')[0]?.args).toEqual(['name', { ascending: true }])
  })

  it('sorts by highest rating, unrated last, then by rating count', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { sort: 'rating' }), makeRes())

    expect(callsTo(calls, 'order').map((c) => c.args)).toEqual([
      ['avg_rating', { ascending: false, nullsFirst: false }],
      ['rating_count', { ascending: false }],
    ])
  })

  it('sorts by newest first', async () => {
    const calls = setupQuery()

    await handler(makeReq('GET', { sort: 'newest' }), makeRes())

    expect(callsTo(calls, 'order')[0]?.args).toEqual(['created_at', { ascending: false }])
  })

  it('rejects an unknown sort', async () => {
    setupQuery()
    const res = makeRes()

    await handler(makeReq('GET', { sort: 'random' }), res)

    expect(statusOf(res)).toBe(400)
  })

  it('returns 500 when the query fails', async () => {
    setupQuery({ data: null, count: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(500)
  })

  it('returns 405 for non-GET requests', async () => {
    const res = makeRes()

    await handler(makeReq('POST'), res)

    expect(statusOf(res)).toBe(405)
  })
})
