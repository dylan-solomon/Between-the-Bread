import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()
const mockDeleteEqSelect = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

import handler from '../[id].js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'DELETE',
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

const setupDeleteChain = () => {
  mockFrom.mockReturnValue({ delete: mockDelete })
  mockDelete.mockReturnValue({ eq: mockDeleteEq })
  mockDeleteEq.mockReturnValue({ select: mockDeleteEqSelect })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('DELETE /api/[targetType]/[slug]/comments/:id', () => {
  it('returns 204 on successful delete of a top-level comment', async () => {
    setupDeleteChain()
    mockDeleteEqSelect.mockResolvedValue({ data: [{ parent_id: null }], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(204)
    expect(res._ended).toBe(true)
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'comment-1')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("decrements the parent's reply_count when deleting a reply", async () => {
    setupDeleteChain()
    mockDeleteEqSelect.mockResolvedValue({ data: [{ parent_id: 'parent-1' }], error: null })
    mockRpc.mockResolvedValue({ data: 0, error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(204)
    expect(mockRpc).toHaveBeenCalledWith('adjust_comment_reply_count', { p_comment_id: 'parent-1', p_delta: -1 })
  })

  it('does not call adjust_comment_reply_count when nothing was deleted', async () => {
    setupDeleteChain()
    mockDeleteEqSelect.mockResolvedValue({ data: [], error: null })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(204)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when the delete fails', async () => {
    setupDeleteChain()
    mockDeleteEqSelect.mockResolvedValue({ data: null, error: { message: 'delete failed' } })

    const res = makeRes()
    await handler(makeReq(), res)

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
