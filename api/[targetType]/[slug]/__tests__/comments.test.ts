import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockSelect = vi.fn()
const mockIn = vi.fn()
const mockOrderReplies = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockInsertSelectSingle = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

import handler from '../comments.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: { targetType: 'database', slug: 'reuben', target_id: 'target-uuid-123' },
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

type QueryResult = { data: unknown; error: unknown }

const setupRepliesChain = (replies: QueryResult) => {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ in: mockIn })
  mockIn.mockReturnValue({ order: mockOrderReplies })
  mockOrderReplies.mockResolvedValue(replies)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/[targetType]/[slug]/comments', () => {
  const topLevelComments = [
    { id: 'c1', user_id: 'user-1', body: 'First!', parent_id: null, like_count: 3, reply_count: 1, created_at: '2026-01-01T00:00:00Z', total_count: 2 },
    { id: 'c2', user_id: 'user-2', body: 'Second', parent_id: null, like_count: 0, reply_count: 0, created_at: '2026-01-02T00:00:00Z', total_count: 2 },
  ]
  const reply = { id: 'r1', user_id: 'user-3', body: 'Reply to first', parent_id: 'c1', like_count: 0, reply_count: 0, created_at: '2026-01-03T00:00:00Z' }

  it('returns 200 with replies nested and like_count/reply_count on each comment', async () => {
    mockRpc.mockResolvedValue({ data: topLevelComments, error: null })
    setupRepliesChain({ data: [reply], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    const body = res._json as { data: { id: string; like_count: number; reply_count: number; replies: unknown[] }[]; meta: { total_count: number } }
    expect(body.data).toHaveLength(2)
    expect(body.data[0].id).toBe('c1')
    expect(body.data[0].like_count).toBe(3)
    expect(body.data[0].reply_count).toBe(1)
    expect(body.data[0].replies).toEqual([reply])
    expect(body.data[1].replies).toEqual([])
    expect(body.meta.total_count).toBe(2)
  })

  it('does not leak the internal total_count field onto individual comments', async () => {
    mockRpc.mockResolvedValue({ data: topLevelComments, error: null })
    setupRepliesChain({ data: [reply], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    const body = res._json as { data: Record<string, unknown>[] }
    expect(body.data[0]).not.toHaveProperty('total_count')
  })

  it('defaults to sort=newest, limit=20, offset=0', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(mockRpc).toHaveBeenCalledWith('list_top_level_comments', {
      p_target_type: 'database',
      p_target_id: 'target-uuid-123',
      p_sort: 'newest',
      p_limit: 20,
      p_offset: 0,
    })
  })

  it.each(['newest', 'oldest', 'best', 'hot'])('passes sort=%s through to the RPC call', async (sort) => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'database', slug: 'reuben', target_id: 'target-uuid-123', sort } }), res)

    expect(mockRpc).toHaveBeenCalledWith('list_top_level_comments', expect.objectContaining({ p_sort: sort }))
  })

  it('defaults an invalid sort value to newest', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'database', slug: 'reuben', target_id: 'target-uuid-123', sort: 'bogus' } }), res)

    expect(mockRpc).toHaveBeenCalledWith('list_top_level_comments', expect.objectContaining({ p_sort: 'newest' }))
  })

  it('applies limit and offset from query params', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'database', slug: 'reuben', target_id: 'target-uuid-123', limit: '5', offset: '10' } }), res)

    expect(mockRpc).toHaveBeenCalledWith('list_top_level_comments', expect.objectContaining({ p_limit: 5, p_offset: 10 }))
  })

  it('skips the replies query when there are no top-level comments', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    const body = res._json as { data: unknown[]; meta: { total_count: number } }
    expect(body.data).toEqual([])
    expect(body.meta.total_count).toBe(0)
    expect(mockIn).not.toHaveBeenCalled()
  })

  it('returns 400 when targetType is invalid', async () => {
    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'invalid', slug: 'reuben', target_id: 'target-uuid-123' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_TARGET_TYPE')
  })

  it('returns 400 when target_id is missing', async () => {
    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'database', slug: 'reuben' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_TARGET_ID')
  })

  it('returns 500 when the RPC call fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 500 when the replies query fails', async () => {
    mockRpc.mockResolvedValue({ data: topLevelComments, error: null })
    setupRepliesChain({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })
})

describe('POST /api/[targetType]/[slug]/comments', () => {
  const setupInsertChain = () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSelectSingle })
  }

  const postReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
    makeReq({
      method: 'POST',
      body: { target_id: 'target-uuid-123', body: 'Great sandwich!' },
      ...overrides,
    })

  it('returns 201 with the created comment', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({
      data: { id: 'c1', body: 'Great sandwich!', parent_id: null, created_at: '2026-01-01T00:00:00Z' },
      error: null,
    })

    const res = makeRes()
    await handler(postReq(), res)

    expect(res._status).toBe(201)
    expect((res._json as { data: { id: string } }).data.id).toBe('c1')
  })

  it('inserts with user_id, target_type, target_id, body, and a null parent_id when not a reply', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'c1', parent_id: null }, error: null })

    const res = makeRes()
    await handler(postReq(), res)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        target_type: 'database',
        target_id: 'target-uuid-123',
        body: 'Great sandwich!',
        parent_id: null,
      }),
    )
  })

  it('passes parent_id through when replying to a comment', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'r1', parent_id: 'c1' }, error: null })
    mockRpc.mockResolvedValue({ data: 1, error: null })

    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', body: 'Me too!', parent_id: 'c1' } }), res)

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ parent_id: 'c1' }))
  })

  it("increments the parent comment's reply_count when creating a reply", async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'r1', parent_id: 'c1' }, error: null })
    mockRpc.mockResolvedValue({ data: 4, error: null })

    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', body: 'Me too!', parent_id: 'c1' } }), res)

    expect(mockRpc).toHaveBeenCalledWith('adjust_comment_reply_count', { p_comment_id: 'c1', p_delta: 1 })
  })

  it('does not adjust any reply_count when creating a top-level comment', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'c1', parent_id: null }, error: null })

    const res = makeRes()
    await handler(postReq(), res)

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 400 when targetType is invalid', async () => {
    const res = makeRes()
    await handler(postReq({ query: { targetType: 'invalid', slug: 'reuben' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_TARGET_TYPE')
  })

  it('returns 400 when target_id is missing', async () => {
    const res = makeRes()
    await handler(postReq({ body: { body: 'No target' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_TARGET_ID')
  })

  it('returns 400 when body is empty', async () => {
    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', body: '   ' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_BODY')
  })

  it('returns 400 when body exceeds 500 characters', async () => {
    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', body: 'a'.repeat(501) } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_BODY')
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })

    const res = makeRes()
    await handler(postReq(), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when the insert fails', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(postReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })
})

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)
    expect(res._status).toBe(405)
  })
})
