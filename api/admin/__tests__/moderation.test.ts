import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

import handleModeration from '../_handlers/moderation.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({ method: 'GET', body: undefined, ...overrides }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/admin/moderation/comments', () => {
  it('returns 200 with flagged or pending comments', async () => {
    mockFrom.mockReturnValue({ select: () => ({ or: () => ({ order: () => Promise.resolve({ data: [{ id: 'c1' }], error: null }) }) }) })
    const res = makeRes()

    await handleModeration(makeReq(), res, mockSupabase as never, 'comments', undefined)

    expect(mockFrom).toHaveBeenCalledWith('comments')
    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toHaveLength(1)
  })

  it('returns 500 when the query fails', async () => {
    mockFrom.mockReturnValue({ select: () => ({ or: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }) })
    const res = makeRes()

    await handleModeration(makeReq(), res, mockSupabase as never, 'comments', undefined)
    expect(res._status).toBe(500)
  })
})

describe('GET /api/admin/moderation/photos', () => {
  it('returns 200 with pending photos', async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'p1' }], error: null }) }) }) })
    const res = makeRes()

    await handleModeration(makeReq(), res, mockSupabase as never, 'photos', undefined)

    expect(mockFrom).toHaveBeenCalledWith('photos')
    expect(res._status).toBe(200)
  })
})

describe('PATCH /api/admin/moderation/comments/:id', () => {
  it('approves a comment', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'c1', is_approved: true }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
    const res = makeRes()

    await handleModeration(makeReq({ method: 'PATCH', body: { action: 'approve' } }), res, mockSupabase as never, 'comments', 'c1')

    expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true, is_flagged: false })
    expect(res._status).toBe(200)
  })

  it('rejects a comment by deleting it', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })
    const res = makeRes()

    await handleModeration(makeReq({ method: 'PATCH', body: { action: 'reject' } }), res, mockSupabase as never, 'comments', 'c1')

    expect(mockEq).toHaveBeenCalledWith('id', 'c1')
    expect(res._status).toBe(200)
  })

  it('returns 400 for an invalid action', async () => {
    const res = makeRes()
    await handleModeration(makeReq({ method: 'PATCH', body: { action: 'bogus' } }), res, mockSupabase as never, 'comments', 'c1')
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_ACTION')
  })

  it('returns 400 when id is missing', async () => {
    const res = makeRes()
    await handleModeration(makeReq({ method: 'PATCH', body: { action: 'approve' } }), res, mockSupabase as never, 'comments', undefined)
    expect(res._status).toBe(400)
  })
})

describe('PATCH /api/admin/moderation/photos/:id', () => {
  it('approves a photo', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'p1', is_approved: true }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
    const res = makeRes()

    await handleModeration(makeReq({ method: 'PATCH', body: { action: 'approve' } }), res, mockSupabase as never, 'photos', 'p1')

    expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true })
    expect(res._status).toBe(200)
  })
})

describe('unrecognized resource', () => {
  it('returns 404', async () => {
    const res = makeRes()
    await handleModeration(makeReq(), res, mockSupabase as never, 'bogus' as never, undefined)
    expect(res._status).toBe(404)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    const res = makeRes()
    await handleModeration(makeReq({ method: 'DELETE' }), res, mockSupabase as never, 'comments', undefined)
    expect(res._status).toBe(405)
  })
})
