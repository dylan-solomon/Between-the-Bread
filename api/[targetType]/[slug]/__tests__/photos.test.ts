import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEqTargetType = vi.fn()
const mockEqTargetId = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockInsertSelectSingle = vi.fn()
const mockStorageFrom = vi.fn()
const mockCreateSignedUrls = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  }),
}))

import handler from '../photos.js'

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

type QueryResult = { data: unknown; error: unknown; count?: number | null }

const setupPhotosChain = (result: QueryResult) => {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEqTargetType })
  mockEqTargetType.mockReturnValue({ eq: mockEqTargetId })
  mockEqTargetId.mockReturnValue({ order: mockOrder })
  mockOrder.mockReturnValue({ range: mockRange })
  mockRange.mockResolvedValue(result)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/[targetType]/[slug]/photos', () => {
  const photoRows = [
    { id: 'p1', user_id: 'user-1', storage_path: 'user-1/a.jpg', caption: 'Nice', created_at: '2026-01-02T00:00:00Z' },
    { id: 'p2', user_id: 'user-2', storage_path: 'user-2/b.jpg', caption: null, created_at: '2026-01-01T00:00:00Z' },
  ]

  const setupSignedUrls = (results: { path: string; signedUrl: string | null; error: unknown }[]) => {
    mockStorageFrom.mockReturnValue({ createSignedUrls: mockCreateSignedUrls })
    mockCreateSignedUrls.mockResolvedValue({ data: results, error: null })
  }

  it('returns 200 with signed URLs merged onto each photo', async () => {
    setupPhotosChain({ data: photoRows, error: null, count: 2 })
    setupSignedUrls([
      { path: 'user-1/a.jpg', signedUrl: 'https://signed/a.jpg', error: null },
      { path: 'user-2/b.jpg', signedUrl: 'https://signed/b.jpg', error: null },
    ])

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    const body = res._json as { data: { id: string; signed_url: string | null }[]; meta: { total_count: number } }
    expect(body.data).toHaveLength(2)
    expect(body.data[0].signed_url).toBe('https://signed/a.jpg')
    expect(body.data[1].signed_url).toBe('https://signed/b.jpg')
    expect(body.meta.total_count).toBe(2)
  })

  it('does not expose the raw storage_path on returned photos', async () => {
    setupPhotosChain({ data: photoRows, error: null, count: 2 })
    setupSignedUrls([
      { path: 'user-1/a.jpg', signedUrl: 'https://signed/a.jpg', error: null },
      { path: 'user-2/b.jpg', signedUrl: 'https://signed/b.jpg', error: null },
    ])

    const res = makeRes()
    await handler(makeReq(), res)

    const body = res._json as { data: Record<string, unknown>[] }
    expect(body.data[0]).not.toHaveProperty('storage_path')
  })

  it('sets signed_url to null when an individual signed URL fails to generate', async () => {
    setupPhotosChain({ data: photoRows, error: null, count: 2 })
    setupSignedUrls([
      { path: 'user-1/a.jpg', signedUrl: null, error: { message: 'not found' } },
      { path: 'user-2/b.jpg', signedUrl: 'https://signed/b.jpg', error: null },
    ])

    const res = makeRes()
    await handler(makeReq(), res)

    const body = res._json as { data: { signed_url: string | null }[] }
    expect(body.data[0].signed_url).toBeNull()
    expect(body.data[1].signed_url).toBe('https://signed/b.jpg')
  })

  it('sorts by created_at descending', async () => {
    setupPhotosChain({ data: [], error: null, count: 0 })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('defaults limit to 20 and offset to 0', async () => {
    setupPhotosChain({ data: [], error: null, count: 0 })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(mockRange).toHaveBeenCalledWith(0, 19)
  })

  it('applies limit and offset from query params', async () => {
    setupPhotosChain({ data: [], error: null, count: 0 })

    const res = makeRes()
    await handler(makeReq({ query: { targetType: 'database', slug: 'reuben', target_id: 'target-uuid-123', limit: '5', offset: '10' } }), res)

    expect(mockRange).toHaveBeenCalledWith(10, 14)
  })

  it('skips the signed URL call when there are no photos', async () => {
    setupPhotosChain({ data: [], error: null, count: 0 })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    const body = res._json as { data: unknown[]; meta: { total_count: number } }
    expect(body.data).toEqual([])
    expect(body.meta.total_count).toBe(0)
    expect(mockStorageFrom).not.toHaveBeenCalled()
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

  it('returns 500 when the photos query fails', async () => {
    setupPhotosChain({ data: null, error: { message: 'db error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 500 when signed URL generation fails at the batch level', async () => {
    setupPhotosChain({ data: photoRows, error: null, count: 2 })
    mockStorageFrom.mockReturnValue({ createSignedUrls: mockCreateSignedUrls })
    mockCreateSignedUrls.mockResolvedValue({ data: null, error: { message: 'storage error' } })

    const res = makeRes()
    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect((res._json as { error: { code: string } }).error.code).toBe('INTERNAL_ERROR')
  })
})

describe('POST /api/[targetType]/[slug]/photos', () => {
  const setupInsertChain = () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSelectSingle })
  }

  const postReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
    makeReq({
      method: 'POST',
      body: { target_id: 'target-uuid-123', storage_path: 'user-123/photo.jpg' },
      ...overrides,
    })

  it('returns 201 with the created photo record', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({
      data: { id: 'p1', storage_path: 'user-123/photo.jpg', caption: null, is_approved: false, created_at: '2026-01-01T00:00:00Z' },
      error: null,
    })

    const res = makeRes()
    await handler(postReq(), res)

    expect(res._status).toBe(201)
    expect((res._json as { data: { id: string } }).data.id).toBe('p1')
  })

  it('inserts with user_id, target_type, target_id, storage_path, is_approved false, and a null caption when not provided', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'p1' }, error: null })

    const res = makeRes()
    await handler(postReq(), res)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        target_type: 'database',
        target_id: 'target-uuid-123',
        storage_path: 'user-123/photo.jpg',
        is_approved: false,
        caption: null,
      }),
    )
  })

  it('passes a trimmed caption through when provided', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: { id: 'p1' }, error: null })

    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', storage_path: 'user-123/photo.jpg', caption: '  Yum!  ' } }), res)

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ caption: 'Yum!' }))
  })

  it('returns 400 when targetType is invalid', async () => {
    const res = makeRes()
    await handler(postReq({ query: { targetType: 'invalid', slug: 'reuben' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_TARGET_TYPE')
  })

  it('returns 400 when target_id is missing', async () => {
    const res = makeRes()
    await handler(postReq({ body: { storage_path: 'user-123/photo.jpg' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_TARGET_ID')
  })

  it('returns 400 when storage_path is missing', async () => {
    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_STORAGE_PATH')
  })

  it('returns 400 when caption exceeds 100 characters', async () => {
    const res = makeRes()
    await handler(postReq({ body: { target_id: 'target-uuid-123', storage_path: 'user-123/photo.jpg', caption: 'a'.repeat(101) } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_CAPTION')
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
