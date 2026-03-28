import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()
const mockAdminDeleteUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) => {
    if (key === 'service-role-key') {
      return { auth: { admin: { deleteUser: mockAdminDeleteUser } } }
    }
    return {
      auth: { getUser: mockGetUser },
      from: mockFrom,
    }
  },
}))

import handler from '../index.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code
      return res
    },
    json(body: unknown) {
      res._json = body
      return res
    },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const validUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
}

const profileRow = {
  display_name: 'SandwichFan',
  dietary_filters: ['vegetarian'],
  smart_mode_default: true,
  double_protein: false,
  double_cheese: true,
  cost_context: 'retail',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
}

beforeEach(() => {
  mockGetUser.mockReset()
  mockFrom.mockReset()
  mockSelect.mockReset()
  mockEq.mockReset()
  mockSingle.mockReset()
  mockUpdate.mockReset()
  mockUpdateEq.mockReset()
  mockAdminDeleteUser.mockReset()

  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')

  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
  mockUpdate.mockReturnValue({ eq: mockUpdateEq })
})

describe('GET /api/profile', () => {
  it('returns 401 when authorization header is missing', async () => {
    const res = makeRes()
    await handler(makeReq({ headers: {} }), res)
    expect(res._status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(401)
  })

  it('returns 404 when profile does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(404)
  })

  it('returns 200 with profile data', async () => {
    mockSingle.mockResolvedValue({ data: profileRow, error: null })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(200)
    const body = res._json as { data: { profile: typeof profileRow } }
    expect(body.data.profile).toEqual(profileRow)
  })
})

describe('PATCH /api/profile', () => {
  it('returns 400 when body is empty', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: {} }), res)
    expect(res._status).toBe(400)
  })

  it('returns 400 when cost_context is invalid', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { cost_context: 'fancy' } }), res)
    expect(res._status).toBe(400)
  })

  it('returns 400 when dietary_filters contains invalid tag', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { dietary_filters: ['keto'] } }), res)
    expect(res._status).toBe(400)
  })

  it('returns 200 on successful update', async () => {
    mockUpdateEq.mockResolvedValue({ error: null })
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { display_name: 'NewName' } }), res)
    expect(res._status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'NewName' }),
    )
  })

  it('includes updated_at in the update payload', async () => {
    mockUpdateEq.mockResolvedValue({ error: null })
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { smart_mode_default: true } }), res)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ updated_at: expect.any(String) as string }),
    )
  })

  it('returns 500 when update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'DB error' } })
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { display_name: 'Test' } }), res)
    expect(res._status).toBe(500)
  })
})

describe('DELETE /api/profile', () => {
  it('returns 400 when confirm is not true', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: {} }), res)
    expect(res._status).toBe(400)
  })

  it('returns 400 when confirm is false', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: { confirm: false } }), res)
    expect(res._status).toBe(400)
  })

  it('returns 500 when service role key is missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: { confirm: true } }), res)
    expect(res._status).toBe(500)
  })

  it('returns 500 when admin deleteUser fails', async () => {
    mockAdminDeleteUser.mockResolvedValue({ error: { message: 'Admin error' } })
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: { confirm: true } }), res)
    expect(res._status).toBe(500)
  })

  it('calls admin deleteUser with the authenticated user id', async () => {
    mockAdminDeleteUser.mockResolvedValue({ error: null })
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: { confirm: true } }), res)
    expect(mockAdminDeleteUser).toHaveBeenCalledWith('user-123')
  })

  it('returns 200 on successful deletion', async () => {
    mockAdminDeleteUser.mockResolvedValue({ error: null })
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE', body: { confirm: true } }), res)
    expect(res._status).toBe(200)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for POST', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'POST' }), res)
    expect(res._status).toBe(405)
  })
})
