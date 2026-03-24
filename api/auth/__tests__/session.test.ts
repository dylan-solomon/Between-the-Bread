import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import handler from '../session.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
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

beforeEach(() => {
  mockGetUser.mockReset()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
})

describe('GET /api/auth/session', () => {
  it('returns 405 for non-GET methods', async () => {
    const req = makeReq({ method: 'POST' })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(405)
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = makeReq({ headers: {} })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(401)
    expect((res._json as { error: { code: string } }).error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(401)
  })

  it('returns 200 with user data for valid token', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
      error: null,
    })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(200)
    expect((res._json as { data: { user: { id: string } } }).data.user.id).toBe('user-123')
    expect((res._json as { data: { user: { email: string } } }).data.user.email).toBe('test@example.com')
  })
})
