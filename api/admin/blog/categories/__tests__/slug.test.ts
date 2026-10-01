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

import handler from '../[slug].js'

type Result = { data: unknown; error: unknown }

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'PATCH',
    headers: { authorization: 'Bearer valid-token' },
    body: {},
    query: { slug: 'dietary' },
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

const setupCategories = (result: Result) => {
  const calls: Call[] = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileBranch(true)
    calls.push({ method: 'from', args: [table] })
    return chain(result, calls)
  })
  return calls
}

const callsOf = (calls: Call[], method: string) => calls.filter((call) => call.method === method)

const stubRow = {
  id: 'c4',
  slug: 'dietary',
  name: 'Diets',
  description: null,
  display_order: 4,
  blog_post_categories: [{ count: 2 }],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('PATCH /api/admin/blog/categories/:slug', () => {
  it('updates the category and returns it with its post count', async () => {
    const calls = setupCategories({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'Diets' } }), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown }).data).toEqual({
      id: 'c4',
      slug: 'dietary',
      name: 'Diets',
      description: null,
      display_order: 4,
      post_count: 2,
    })
    expect(callsOf(calls, 'update')[0]?.args[0]).toEqual({ name: 'Diets' })
    expect(callsOf(calls, 'eq')[0]?.args).toEqual(['slug', 'dietary'])
  })

  it('returns 400 when the slug is in the body', async () => {
    const calls = setupCategories({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { slug: 'other' } }), res)

    expect(res._status).toBe(400)
    expect(callsOf(calls, 'update')).toHaveLength(0)
  })

  it('returns 404 when the category does not exist', async () => {
    setupCategories({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'Diets' } }), res)

    expect(res._status).toBe(404)
    expect((res._json as { error: { code: string } }).error.code).toBe('CATEGORY_NOT_FOUND')
  })

  it('returns 500 when the update fails', async () => {
    setupCategories({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'Diets' } }), res)

    expect(res._status).toBe(500)
  })
})

describe('DELETE /api/admin/blog/categories/:slug', () => {
  it('deletes a category that no post uses', async () => {
    const calls = setupCategories({ data: [{ slug: 'dietary' }], error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown }).data).toEqual({ slug: 'dietary', deleted: true })
    expect(callsOf(calls, 'delete')).toHaveLength(1)
    expect(callsOf(calls, 'eq')[0]?.args).toEqual(['slug', 'dietary'])
  })

  it('returns 409 while a post uses the category', async () => {
    setupCategories({ data: null, error: { code: '23503', message: 'violates foreign key' } })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(409)
    expect((res._json as { error: { code: string } }).error.code).toBe('CATEGORY_IN_USE')
  })

  it('returns 404 when the category does not exist', async () => {
    setupCategories({ data: [], error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(404)
  })

  it('returns 500 when the delete fails', async () => {
    setupCategories({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(500)
  })

  it('returns 403 for a signed-in user who is not an admin', async () => {
    mockFrom.mockImplementation(() => profileBranch(false))
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(403)
  })
})

describe('other methods', () => {
  it('returns 405 for POST', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST' }), res)

    expect(res._status).toBe(405)
  })
})
