import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockAuthenticateRequest } = vi.hoisted(() => ({ mockAuthenticateRequest: vi.fn() }))

vi.mock('../auth.js', () => ({ authenticateRequest: mockAuthenticateRequest }))

import { authenticateAdminRequest } from '../adminAuth.js'

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const makeReq = (): VercelRequest => ({ headers: { authorization: 'Bearer valid-token' } }) as unknown as VercelRequest

const validUser = { id: 'user-123', email: 'admin@example.com' }

const mockSingle = vi.fn()
const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
const mockSupabase = { from: mockFrom }

beforeEach(() => {
  vi.clearAllMocks()
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
})

describe('authenticateAdminRequest', () => {
  it('returns null when the base authentication fails', async () => {
    mockAuthenticateRequest.mockResolvedValue(null)
    const res = makeRes()

    const result = await authenticateAdminRequest(makeReq(), res)

    expect(result).toBeNull()
  })

  it('returns null and 403 when the user is not an admin', async () => {
    mockAuthenticateRequest.mockResolvedValue({ supabase: mockSupabase, user: validUser })
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null })
    const res = makeRes()

    const result = await authenticateAdminRequest(makeReq(), res)

    expect(result).toBeNull()
    expect(res._status).toBe(403)
    expect((res._json as { error: { code: string } }).error.code).toBe('FORBIDDEN')
  })

  it('returns null and 403 when the profile lookup errors', async () => {
    mockAuthenticateRequest.mockResolvedValue({ supabase: mockSupabase, user: validUser })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = makeRes()

    const result = await authenticateAdminRequest(makeReq(), res)

    expect(result).toBeNull()
    expect(res._status).toBe(403)
  })

  it('returns the supabase client and user when the user is an admin', async () => {
    mockAuthenticateRequest.mockResolvedValue({ supabase: mockSupabase, user: validUser })
    mockSingle.mockResolvedValue({ data: { is_admin: true }, error: null })
    const res = makeRes()

    const result = await authenticateAdminRequest(makeReq(), res)

    expect(result).toEqual({ supabase: mockSupabase, user: validUser })
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
  })
})
