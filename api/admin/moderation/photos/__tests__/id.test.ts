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

import handler from '../[id].js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'PATCH',
    headers: { authorization: 'Bearer valid-token' },
    body: { action: 'approve' },
    query: { id: 'p1' },
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

describe('PATCH /api/admin/moderation/photos/:id', () => {
  it('approves a photo', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'p1', is_approved: true }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { update: mockUpdate }))
    const res = makeRes()

    await handler(makeReq(), res)

    expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true })
    expect(res._status).toBe(200)
  })

  it('rejects a photo by deleting it', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { delete: mockDelete }))
    const res = makeRes()

    await handler(makeReq({ body: { action: 'reject' } }), res)

    expect(mockEq).toHaveBeenCalledWith('id', 'p1')
    expect(res._status).toBe(200)
  })

  it('returns 400 for an invalid action', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq({ body: { action: 'bogus' } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_ACTION')
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) } : {}))
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(403)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for GET', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res._status).toBe(405)
  })
})
