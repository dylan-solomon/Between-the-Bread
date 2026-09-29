import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

import handleIngredients from '../_handlers/ingredients.js'

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

describe('GET /api/admin/ingredients', () => {
  it('returns 200 with all ingredients including disabled ones', async () => {
    mockFrom.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: [{ id: 'i1', enabled: false }], error: null }) }) })
    const res = makeRes()

    await handleIngredients(makeReq(), res, mockSupabase as never, undefined)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toHaveLength(1)
  })

  it('returns 500 when the query fails', async () => {
    mockFrom.mockReturnValue({ select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) })
    const res = makeRes()

    await handleIngredients(makeReq(), res, mockSupabase as never, undefined)

    expect(res._status).toBe(500)
  })
})

describe('POST /api/admin/ingredients', () => {
  const setupInsertChain = () => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockFrom.mockReturnValue({ insert: mockInsert })
    return { mockInsert, mockSingle }
  }

  const validBody = { category_id: 'cat-1', name: 'Havarti', slug: 'havarti' }

  it('creates a new ingredient with sensible defaults', async () => {
    const { mockInsert, mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: { id: 'new-1', ...validBody }, error: null })
    const res = makeRes()

    await handleIngredients(makeReq({ method: 'POST', body: validBody }), res, mockSupabase as never, undefined)

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      category_id: 'cat-1',
      name: 'Havarti',
      slug: 'havarti',
      dietary_tags: [],
      is_trigger: false,
      enabled: true,
    }))
    expect(res._status).toBe(201)
  })

  it('returns 400 when category_id is missing', async () => {
    const res = makeRes()
    await handleIngredients(makeReq({ method: 'POST', body: { name: 'Havarti', slug: 'havarti' } }), res, mockSupabase as never, undefined)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_CATEGORY_ID')
  })

  it('returns 400 when name is missing', async () => {
    const res = makeRes()
    await handleIngredients(makeReq({ method: 'POST', body: { category_id: 'cat-1', slug: 'havarti' } }), res, mockSupabase as never, undefined)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_NAME')
  })

  it('returns 400 when slug is missing', async () => {
    const res = makeRes()
    await handleIngredients(makeReq({ method: 'POST', body: { category_id: 'cat-1', name: 'Havarti' } }), res, mockSupabase as never, undefined)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_SLUG')
  })

  it('returns 500 when insert fails', async () => {
    const { mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'db error' } })
    const res = makeRes()

    await handleIngredients(makeReq({ method: 'POST', body: validBody }), res, mockSupabase as never, undefined)
    expect(res._status).toBe(500)
  })
})

describe('PATCH /api/admin/ingredients/:id', () => {
  const setupUpdateChain = () => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
    return { mockUpdate, mockEq, mockSingle }
  }

  it('updates the provided fields', async () => {
    const { mockUpdate, mockEq, mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: { id: 'i1', enabled: false }, error: null })
    const res = makeRes()

    await handleIngredients(makeReq({ method: 'PATCH', body: { enabled: false } }), res, mockSupabase as never, 'i1')

    expect(mockUpdate).toHaveBeenCalledWith({ enabled: false })
    expect(mockEq).toHaveBeenCalledWith('id', 'i1')
    expect(res._status).toBe(200)
  })

  it('returns 400 when the body has no updatable fields', async () => {
    const res = makeRes()
    await handleIngredients(makeReq({ method: 'PATCH', body: {} }), res, mockSupabase as never, 'i1')
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('NO_UPDATES')
  })

  it('returns 404 when the ingredient does not exist', async () => {
    const { mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })
    const res = makeRes()

    await handleIngredients(makeReq({ method: 'PATCH', body: { enabled: false } }), res, mockSupabase as never, 'missing')
    expect(res._status).toBe(404)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    const res = makeRes()
    await handleIngredients(makeReq({ method: 'DELETE' }), res, mockSupabase as never, undefined)
    expect(res._status).toBe(405)
  })
})
