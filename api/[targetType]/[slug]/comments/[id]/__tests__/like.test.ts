import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEqUser = vi.fn()
const mockDeleteEqComment = vi.fn()
const mockDeleteSelect = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

import handler from '../like.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: { targetType: 'database', slug: 'reuben', id: 'comment-1' },
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

describe('POST /api/[targetType]/[slug]/comments/:id/like', () => {
  it('returns 200 with the updated like_count on success', async () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: null })
    mockRpc.mockResolvedValue({ data: 4, error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { like_count: number } }).data.like_count).toBe(4)
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'user-123', comment_id: 'comment-1' })
    expect(mockRpc).toHaveBeenCalledWith('adjust_comment_like_count', { p_comment_id: 'comment-1', p_delta: 1 })
  })

  it('returns 409 when the comment is already liked', async () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(409)
    expect((res._json as { error: { code: string } }).error.code).toBe('ALREADY_LIKED')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when the insert fails for a non-duplicate reason', async () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: { code: '500', message: 'db error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 500 when the like_count adjustment fails', async () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ error: null })
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
  })
})

describe('DELETE /api/[targetType]/[slug]/comments/:id/like', () => {
  const setupDeleteChain = () => {
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockDeleteEqUser })
    mockDeleteEqUser.mockReturnValue({ eq: mockDeleteEqComment })
    mockDeleteEqComment.mockReturnValue({ select: mockDeleteSelect })
  }

  it('returns 200 with the updated like_count on success', async () => {
    setupDeleteChain()
    mockDeleteSelect.mockResolvedValue({ data: [{ id: 'like-1' }], error: null })
    mockRpc.mockResolvedValue({ data: 2, error: null })

    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { like_count: number } }).data.like_count).toBe(2)
    expect(mockDeleteEqUser).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockDeleteEqComment).toHaveBeenCalledWith('comment_id', 'comment-1')
    expect(mockRpc).toHaveBeenCalledWith('adjust_comment_like_count', { p_comment_id: 'comment-1', p_delta: -1 })
  })

  it('returns 404 when the comment was not liked', async () => {
    setupDeleteChain()
    mockDeleteSelect.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(404)
    expect((res._json as { error: { code: string } }).error.code).toBe('NOT_LIKED')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })

    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when the delete fails', async () => {
    setupDeleteChain()
    mockDeleteSelect.mockResolvedValue({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)

    expect(res._status).toBe(500)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for GET', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res._status).toBe(405)
  })
})
