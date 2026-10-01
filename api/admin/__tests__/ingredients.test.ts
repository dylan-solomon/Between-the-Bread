import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import handler from '../ingredients.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: {},
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const validUser = { id: 'admin-1', email: 'admin@example.com' }

const adminProfileBranch = { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/ingredients', () => {
  it('returns 200 with all ingredients including disabled ones', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBranch
      return { select: () => ({ order: () => Promise.resolve({ data: [{ id: 'i1', enabled: false }], error: null }) }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toHaveLength(1)
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) }
      throw new Error('should not query ingredients')
    })
    const res = makeRes()

    await handler(makeReq(), res)
    expect(res._status).toBe(403)
  })

  it('returns 500 when the query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBranch
      return { select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)
    expect(res._status).toBe(500)
  })
})

describe('POST /api/admin/ingredients', () => {
  const setupInsertChain = () => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return adminProfileBranch
      return { insert: mockInsert }
    })
    return { mockInsert, mockSingle }
  }

  const validBody = { category_id: 'cat-1', name: 'Havarti', slug: 'havarti' }

  const completeData = {
    nutrition: { calories: 100, protein_g: 5, fat_g: 3, carbs_g: 10, fiber_g: 1, sodium_mg: 100, sugar_g: 2 },
    estimated_cost: { retail_low: 0.5, retail_high: 1, restaurant_low: 1, restaurant_high: 2 },
  }

  it('creates new ingredients disabled unless the request says otherwise', async () => {
    const { mockInsert, mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: { id: 'new-1', ...validBody }, error: null })

    await handler(makeReq({ method: 'POST', body: validBody }), makeRes())

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
  })

  it('creates an enabled ingredient when it comes with complete nutrition and cost', async () => {
    const { mockInsert, mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: { id: 'new-1', ...validBody }, error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { ...validBody, ...completeData, enabled: true } }), res)

    expect(res._status).toBe(201)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
  })

  it.each([
    ['no nutrition or cost', {}, 'INCOMPLETE_INGREDIENT'],
    ['no cost', { nutrition: completeData.nutrition }, 'INCOMPLETE_INGREDIENT'],
    ['no nutrition', { estimated_cost: completeData.estimated_cost }, 'INCOMPLETE_INGREDIENT'],
    ['incomplete nutrition', { ...completeData, nutrition: { calories: 100 } }, 'INVALID_NUTRITION'],
  ])('refuses to create an enabled ingredient with %s', async (_label, extra, expectedCode) => {
    const { mockInsert } = setupInsertChain()
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { ...validBody, ...extra, enabled: true } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe(expectedCode)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects nutrition that is incomplete even when the ingredient stays disabled', async () => {
    const { mockInsert } = setupInsertChain()
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: { ...validBody, nutrition: { calories: 100 } } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_NUTRITION')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('rejects a cost whose low is above its high', async () => {
    const { mockInsert } = setupInsertChain()
    const res = makeRes()

    await handler(
      makeReq({ method: 'POST', body: { ...validBody, estimated_cost: { retail_low: 3, retail_high: 1, restaurant_low: 1, restaurant_high: 2 } } }),
      res,
    )

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_COST')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates a new ingredient with sensible defaults', async () => {
    const { mockInsert, mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: { id: 'new-1', ...validBody }, error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: validBody }), res)

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      category_id: 'cat-1',
      name: 'Havarti',
      slug: 'havarti',
      dietary_tags: [],
      is_trigger: false,
      enabled: false,
    }))
    expect(res._status).toBe(201)
  })

  it('returns 400 when category_id is missing', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { insert: vi.fn() }))
    const res = makeRes()
    await handler(makeReq({ method: 'POST', body: { name: 'Havarti', slug: 'havarti' } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_CATEGORY_ID')
  })

  it('returns 400 when name is missing', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { insert: vi.fn() }))
    const res = makeRes()
    await handler(makeReq({ method: 'POST', body: { category_id: 'cat-1', slug: 'havarti' } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_NAME')
  })

  it('returns 400 when slug is missing', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { insert: vi.fn() }))
    const res = makeRes()
    await handler(makeReq({ method: 'POST', body: { category_id: 'cat-1', name: 'Havarti' } }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_SLUG')
  })

  it('returns 500 when insert fails', async () => {
    const { mockSingle } = setupInsertChain()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'db error' } })
    const res = makeRes()

    await handler(makeReq({ method: 'POST', body: validBody }), res)
    expect(res._status).toBe(500)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)
    expect(res._status).toBe(405)
  })
})
