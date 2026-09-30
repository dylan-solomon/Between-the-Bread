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

import handler from '../comments.js'

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
const adminProfileBranch = { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/moderation/comments', () => {
  it('returns 200 with flagged or pending comments', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBranch
      return { select: () => ({ or: () => ({ order: () => Promise.resolve({ data: [{ id: 'c1' }], error: null }) }) }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toHaveLength(1)
  })

  it('returns 500 when the query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBranch
      return { select: () => ({ or: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)
    expect(res._status).toBe(500)
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) } : {}))
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(403)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for PATCH', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH' }), res)
    expect(res._status).toBe(405)
  })
})
