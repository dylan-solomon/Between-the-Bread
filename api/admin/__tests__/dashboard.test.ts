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

import handler from '../dashboard.js'

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
const notAdminProfileBranch = { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) }

const countResult = (count: number) => ({ select: () => Promise.resolve({ count, error: null }) })
const filteredCountResult = (count: number) => ({ select: () => ({ or: () => Promise.resolve({ count, error: null }) }) })
const eqCountResult = (count: number) => ({ select: () => ({ eq: () => Promise.resolve({ count, error: null }) }) })

// `profiles` is queried twice with different chain shapes: once by the admin-check
// (select().eq().single()) and once by this handler's own user count (a plain
// awaited select()). Track call order to return the right shape each time.
const setupCounts = () => {
  let profilesCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      profilesCallCount += 1
      return profilesCallCount === 1 ? adminProfileBranch : countResult(10)
    }
    if (table === 'saved_sandwiches') return countResult(25)
    if (table === 'shared_sandwiches') return countResult(5)
    if (table === 'ratings') return countResult(40)
    if (table === 'comments') return filteredCountResult(2)
    if (table === 'photos') return eqCountResult(3)
    throw new Error(`unexpected table ${table}`)
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/dashboard', () => {
  it('returns 200 with aggregated metrics', async () => {
    setupCounts()
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: Record<string, number> }).data).toEqual({
      total_users: 10,
      total_saved_sandwiches: 25,
      total_shared_links: 5,
      total_ratings: 40,
      pending_moderation_count: 5,
    })
  })

  it('returns 500 when any query fails', async () => {
    setupCounts()
    mockFrom.mockImplementationOnce(() => adminProfileBranch)
    mockFrom.mockImplementationOnce(() => ({ select: () => Promise.resolve({ count: null, error: { message: 'db error' } }) }))
    const res = makeRes()

    await handler(makeReq(), res)
    expect(res._status).toBe(500)
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? notAdminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(403)
  })

  it('returns 405 for non-GET requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'POST' }), res)
    expect(res._status).toBe(405)
  })
})
