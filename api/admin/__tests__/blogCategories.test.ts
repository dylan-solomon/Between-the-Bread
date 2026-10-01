import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import handler from '../blog/categories.js'

type Result = { data: unknown; error: unknown }

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: {},
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const validUser = { id: 'admin-1', email: 'admin@example.com' }
const profileBranch = (isAdmin: boolean) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) }) }),
})

type Call = { method: string; args: unknown[] }

const chain = (result: Result, calls: Call[]): unknown => {
  const proxy: unknown = new Proxy({}, {
    get: (_target, method: string) => {
      if (method === 'then') return (resolve: (value: Result) => unknown) => resolve(result)
      return (...args: unknown[]) => {
        calls.push({ method, args })
        return proxy
      }
    },
  })
  return proxy
}

const setupCategories = (...results: Result[]) => {
  const calls: Call[] = []
  const queue = [...results]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileBranch(true)
    calls.push({ method: 'from', args: [table] })
    return chain(queue.shift() ?? { data: null, error: null }, calls)
  })
  return calls
}

const callsOf = (calls: Call[], method: string) => calls.filter((call) => call.method === method)

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/blog/categories', () => {
  it('returns every category in display order with its post count', async () => {
    const calls = setupCategories({
      data: [
        { id: 'c1', slug: 'dietary', name: 'Dietary', description: null, display_order: 4, blog_post_categories: [{ count: 3 }] },
        { id: 'c2', slug: 'best-pairings', name: 'Best Pairings', description: 'Pairs', display_order: 2, blog_post_categories: [{ count: 0 }] },
      ],
      error: null,
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown }).data).toEqual([
      { id: 'c1', slug: 'dietary', name: 'Dietary', description: null, display_order: 4, post_count: 3 },
      { id: 'c2', slug: 'best-pairings', name: 'Best Pairings', description: 'Pairs', display_order: 2, post_count: 0 },
    ])
    expect(callsOf(calls, 'from')[0]?.args).toEqual(['blog_categories'])
    expect(callsOf(calls, 'order')[0]?.args[0]).toBe('display_order')
  })

  it('returns 500 when the query fails', async () => {
    setupCategories({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(500)
  })

  it('returns 403 for a signed-in user who is not an admin', async () => {
    mockFrom.mockImplementation(() => profileBranch(false))
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(403)
  })
})

describe('POST /api/admin/blog/categories', () => {
  const created = { id: 'c5', slug: 'best-pairings', name: 'Best Pairings', description: null, display_order: 5 }

  it('creates a category after the last one, with the slug taken from the name', async () => {
    const calls = setupCategories(
      { data: [{ display_order: 4 }], error: null },
      { data: created, error: null },
    )
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { name: 'Best Pairings' } }), res)

    expect(res._status).toBe(201)
    expect((res._json as { data: unknown }).data).toEqual({ ...created, post_count: 0 })
    expect(callsOf(calls, 'insert')[0]?.args[0]).toEqual({
      name: 'Best Pairings',
      slug: 'best-pairings',
      description: null,
      display_order: 5,
    })
  })

  it('starts the order at 1 when there are no categories yet', async () => {
    const calls = setupCategories({ data: [], error: null }, { data: created, error: null })

    await handler(makeReq({ method: 'POST', body: { name: 'Best Pairings' } }), makeRes())

    expect(callsOf(calls, 'insert')[0]?.args[0]).toMatchObject({ display_order: 1 })
  })

  it('uses the display order when one is given', async () => {
    const calls = setupCategories({ data: created, error: null })

    await handler(makeReq({ method: 'POST', body: { name: 'Best Pairings', display_order: 2 } }), makeRes())

    expect(callsOf(calls, 'insert')[0]?.args[0]).toMatchObject({ display_order: 2 })
    expect(callsOf(calls, 'from')).toHaveLength(1)
  })

  it('returns 400 with the reason for invalid input and writes nothing', async () => {
    const calls = setupCategories()
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { name: '' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { message: string } }).error.message).toBe('name must be 1-60 characters.')
    expect(callsOf(calls, 'insert')).toHaveLength(0)
  })

  it('returns 409 when the slug already exists', async () => {
    setupCategories({ data: [], error: null }, { data: null, error: { code: '23505', message: 'duplicate' } })
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { name: 'Best Pairings' } }), res)

    expect(res._status).toBe(409)
    expect((res._json as { error: { code: string } }).error.code).toBe('SLUG_TAKEN')
  })

  it('returns 500 when the insert fails', async () => {
    setupCategories({ data: [], error: null }, { data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { name: 'Best Pairings' } }), res)

    expect(res._status).toBe(500)
  })
})

describe('other methods', () => {
  it('returns 405 for PUT', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'PUT' }), res)

    expect(res._status).toBe(405)
  })
})
