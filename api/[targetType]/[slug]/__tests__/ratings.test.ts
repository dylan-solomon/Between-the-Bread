import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockUpsert = vi.fn()
const mockUpsertSelect = vi.fn()
const mockUpsertSelectSingle = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import handler from '../ratings.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    body: { target_id: 'target-uuid-123', score: 4 },
    query: { targetType: 'database', slug: 'reuben' },
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown; _ended: boolean } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    _ended: false,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
    end() { res._ended = true; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown; _ended: boolean }
}

const validUser = { id: 'user-123', email: 'test@example.com' }

const setupUpsertMock = (error: unknown = null, data: unknown = { id: 'rating-1', score: 4, updated_at: '2026-01-01' }) => {
  mockUpsertSelectSingle.mockResolvedValue({ data, error })
  mockUpsertSelect.mockReturnValue({ single: mockUpsertSelectSingle })
  mockUpsert.mockReturnValue({ select: mockUpsertSelect })
  mockFrom.mockReturnValue({ upsert: mockUpsert })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('POST /api/[targetType]/[slug]/ratings', () => {
  it('returns 200 with upserted rating on success', async () => {
    setupUpsertMock()
    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    const body = res._json as { data: { id: string; score: number } }
    expect(body.data.id).toBe('rating-1')
    expect(body.data.score).toBe(4)
  })

  it('upserts with user_id, target_type, target_id, and score', async () => {
    setupUpsertMock()
    const res = makeRes()
    await handler(makeReq(), res)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        target_type: 'database',
        target_id: 'target-uuid-123',
        score: 4,
      }),
      expect.objectContaining({ onConflict: 'user_id,target_type,target_id' }),
    )
  })

  it('returns 400 when score is below 1', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { target_id: 'uuid', score: 0 } }), res)

    expect(res._status).toBe(400)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
  })

  it('returns 400 when score is above 5', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { target_id: 'uuid', score: 6 } }), res)

    expect(res._status).toBe(400)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
  })

  it('returns 400 when score is not an integer', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { target_id: 'uuid', score: 3.5 } }), res)

    expect(res._status).toBe(400)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_SCORE')
  })

  it('returns 400 when target_id is missing', async () => {
    const res = makeRes()
    await handler(makeReq({ body: { score: 4 } }), res)

    expect(res._status).toBe(400)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('MISSING_TARGET_ID')
  })

  it('does not accept ratings on blog posts', async () => {
    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'blog', slug: 'vegan-builds' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_TARGET_TYPE')
  })

  it('returns 400 when targetType is invalid', async () => {
    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'invalid', slug: 'reuben' } }), res)

    expect(res._status).toBe(400)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_TARGET_TYPE')
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })
    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when Supabase upsert fails', async () => {
    setupUpsertMock({ message: 'db error' }, null)
    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    const body = res._json as { error: { code: string } }
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 405 for non-POST requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)

    expect(res._status).toBe(405)
  })
})
