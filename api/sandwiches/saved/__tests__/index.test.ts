import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockInsertSelectSingle = vi.fn()
const mockSelect = vi.fn()
const mockSelectEq = vi.fn()
const mockIlike = vi.fn()
const mockEqRating = vi.fn()
const mockIsNull = vi.fn()
const mockEqFav = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEq = vi.fn()
const mockDeleteEqFav = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import handler from '../index.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: {},
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

describe('POST /api/sandwiches/saved', () => {
  const validBody = {
    composition: {
      bread: ['id1'],
      protein: ['id2'],
      cheese: ['id3'],
      toppings: ['id4'],
      condiments: ['id5'],
    },
    name: 'Turkey & Swiss on Sourdough',
    total_estimated_cost: { retail_low: 4.2, retail_high: 8.5, restaurant_low: 12.6, restaurant_high: 25.5 },
    total_nutrition: { calories: 620, protein_g: 38, fat_g: 28, carbs_g: 52, fiber_g: 4, sodium_mg: 1450, sugar_g: 6 },
  }

  const setupInsertChain = () => {
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockReturnValue({ select: mockInsertSelect })
    mockInsertSelect.mockReturnValue({ single: mockInsertSelectSingle })
  }

  it('returns 201 with saved sandwich data on success', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({
      data: { id: 'saved-1', name: validBody.name, rating: null, is_favorite: false, created_at: '2026-03-24T00:00:00Z' },
      error: null,
    })

    const req = makeReq({ method: 'POST', body: validBody })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(201)
    expect((res._json as { data: { id: string } }).data.id).toBe('saved-1')
  })

  it('returns 400 when composition is missing required categories', async () => {
    const req = makeReq({ method: 'POST', body: { composition: { bread: ['id1'] }, name: 'Test' } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_COMPOSITION')
  })

  it('returns 400 when name is missing', async () => {
    const req = makeReq({
      method: 'POST',
      body: { composition: validBody.composition },
    })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_NAME')
  })

  it('returns 401 without auth header', async () => {
    const req = makeReq({ method: 'POST', headers: {}, body: validBody })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(401)
  })

  it('returns 500 when insert fails', async () => {
    setupInsertChain()
    mockInsertSelectSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const req = makeReq({ method: 'POST', body: validBody })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(500)
  })
})

describe('GET /api/sandwiches/saved', () => {
  const setupSelectChain = () => {
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockSelectEq })
    mockSelectEq.mockReturnValue({
      ilike: mockIlike,
      eq: mockEqRating,
      is: mockIsNull,
      order: mockOrder,
    })
    mockIlike.mockReturnValue({
      eq: mockEqRating,
      is: mockIsNull,
      order: mockOrder,
    })
    mockEqRating.mockReturnValue({
      eq: mockEqFav,
      order: mockOrder,
    })
    mockIsNull.mockReturnValue({
      eq: mockEqFav,
      order: mockOrder,
    })
    mockEqFav.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ range: mockRange })
  }

  it('returns 200 with sandwich list and meta', async () => {
    setupSelectChain()
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

    const req = makeReq({ query: {} })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(200)
    const json = res._json as { data: unknown[]; meta: { total: number } }
    expect(json.data).toEqual([])
    expect(json.meta.total).toBe(0)
  })

  it('returns 401 without auth', async () => {
    const req = makeReq({ headers: {} })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(401)
  })
})

describe('DELETE /api/sandwiches/saved (clear all)', () => {
  const setupDeleteChain = () => {
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    mockDeleteEq.mockReturnValue({ eq: mockDeleteEqFav })
  }

  it('returns 200 with deleted_count when confirm is true', async () => {
    setupDeleteChain()
    mockDeleteEqFav.mockResolvedValue({ count: 5, error: null })

    const req = makeReq({ method: 'DELETE', body: { confirm: true, include_favorites: false } })
    const res = makeRes()
    await handler(req, res)

    expect(res._status).toBe(200)
    expect((res._json as { data: { deleted_count: number } }).data.deleted_count).toBe(5)
  })

  it('returns 400 when confirm is not true', async () => {
    const req = makeReq({ method: 'DELETE', body: {} })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('CONFIRMATION_REQUIRED')
  })

  it('returns 200 with include_favorites true', async () => {
    mockFrom.mockReturnValue({ delete: mockDelete })
    mockDelete.mockReturnValue({ eq: mockDeleteEq })
    mockDeleteEq.mockResolvedValue({ count: 10, error: null })

    const req = makeReq({ method: 'DELETE', body: { confirm: true, include_favorites: true } })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(200)
    expect((res._json as { data: { deleted_count: number } }).data.deleted_count).toBe(10)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for PUT', async () => {
    const req = makeReq({ method: 'PUT' })
    const res = makeRes()
    await handler(req, res)
    expect(res._status).toBe(405)
  })
})
