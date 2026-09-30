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

import handler from '../compat-matrix.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'PATCH',
    headers: { authorization: 'Bearer valid-token' },
    body: { group_a: 'italian', group_b: 'mediterranean', affinity: 0.9 },
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

const setupUpdateChain = (error: unknown = null) => {
  const mockEqB = vi.fn().mockResolvedValue({ error })
  const mockEqA = vi.fn().mockReturnValue({ eq: mockEqB })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqA })
  mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { update: mockUpdate }))
  return { mockUpdate, mockEqA, mockEqB }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('PATCH /api/admin/compat-matrix', () => {
  it('updates both directions of the pair with the same affinity', async () => {
    setupUpdateChain()
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { group_a: string; group_b: string; affinity: number } }).data).toEqual({
      group_a: 'italian', group_b: 'mediterranean', affinity: 0.9,
    })
  })

  it('returns 400 for an unrecognized group', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq({ body: { group_a: 'bogus', group_b: 'italian', affinity: 0.5 } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_GROUP')
  })

  it('returns 400 when affinity is out of range', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq({ body: { group_a: 'italian', group_b: 'southern', affinity: 1.5 } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_AFFINITY')
  })

  it('returns 500 when updating either direction fails', async () => {
    setupUpdateChain({ message: 'db error' })
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

  it('returns 405 for non-PATCH requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res._status).toBe(405)
  })
})
