import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdateEqSelect = vi.fn()
const mockUpdateEqSelectSingle = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()

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
    body: undefined,
    query: { id: 'sandwich-1' },
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown; _ended: boolean } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    _ended: false,
    status(code: number) {
      res._status = code
      return res
    },
    json(body: unknown) {
      res._json = body
      return res
    },
    end() {
      res._ended = true
      return res
    },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown; _ended: boolean }
}

const validUser = { id: 'user-123', email: 'test@example.com' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('PATCH /api/sandwiches/saved/:id', () => {
  const setupUpdateChain = () => {
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockUpdateEq.mockReturnValue({ select: mockUpdateEqSelect })
    mockUpdateEqSelect.mockReturnValue({ single: mockUpdateEqSelectSingle })
  }

  it('returns 200 with updated rating', async () => {
    setupUpdateChain()
    mockUpdateEqSelectSingle.mockResolvedValue({
      data: { id: 'sandwich-1', rating: 4, is_favorite: false, updated_at: '2026-03-24T00:00:00Z' },
      error: null,
    })

    const req = makeReq({ body: { rating: 4 } })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { rating: number } }).data.rating).toBe(4)
  })

  it('returns 200 with updated is_favorite', async () => {
    setupUpdateChain()
    mockUpdateEqSelectSingle.mockResolvedValue({
      data: { id: 'sandwich-1', rating: null, is_favorite: true, updated_at: '2026-03-24T00:00:00Z' },
      error: null,
    })

    const req = makeReq({ body: { is_favorite: true } })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { is_favorite: boolean } }).data.is_favorite).toBe(true)
  })

  it('accepts null to clear a rating', async () => {
    setupUpdateChain()
    mockUpdateEqSelectSingle.mockResolvedValue({
      data: { id: 'sandwich-1', rating: null, is_favorite: false, updated_at: '2026-03-24T00:00:00Z' },
      error: null,
    })

    const req = makeReq({ body: { rating: null } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(200)
  })

  it('returns 400 when rating is out of range', async () => {
    const req = makeReq({ body: { rating: 6 } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_RATING')
  })

  it('returns 400 when rating is not an integer', async () => {
    const req = makeReq({ body: { rating: 3.5 } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_RATING')
  })

  it('returns 400 when is_favorite is not a boolean', async () => {
    const req = makeReq({ body: { is_favorite: 'yes' } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_FAVORITE')
  })

  it('returns 400 when body has no updatable fields', async () => {
    const req = makeReq({ body: {} })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('NO_UPDATES')
  })

  it('returns 404 when sandwich not found', async () => {
    setupUpdateChain()
    mockUpdateEqSelectSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const req = makeReq({ body: { rating: 3 } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const req = makeReq({ headers: {}, body: { rating: 3 } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(401)
  })
})

describe('DELETE /api/sandwiches/saved/:id', () => {
  it('returns 204 on successful delete', async () => {
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    mockDeleteEq.mockResolvedValue({ error: null })

    const req = makeReq({ method: 'DELETE' })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(204)
    expect(res._ended).toBe(true)
  })

  it('returns 500 when delete fails', async () => {
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    mockDeleteEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const req = makeReq({ method: 'DELETE' })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(500)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for POST', async () => {
    const req = makeReq({ method: 'POST' })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(405)
  })
})
