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

import handler from '../[id].js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'PATCH',
    headers: { authorization: 'Bearer valid-token' },
    body: { enabled: false },
    query: { id: 'ing-1' },
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

describe('PATCH /api/admin/ingredients/:id', () => {
  const setupUpdateChain = () => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : { update: mockUpdate }))
    return { mockUpdate, mockEq, mockSingle }
  }

  it('updates the provided fields', async () => {
    const { mockUpdate, mockEq, mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: { id: 'ing-1', enabled: false }, error: null })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(mockUpdate).toHaveBeenCalledWith({ enabled: false })
    expect(mockEq).toHaveBeenCalledWith('id', 'ing-1')
    expect(res._status).toBe(200)
  })

  it('returns 400 when the body has no updatable fields', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? adminProfileBranch : {}))
    const res = makeRes()
    await handler(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('NO_UPDATES')
  })

  it('returns 404 when the ingredient does not exist', async () => {
    const { mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })
    const res = makeRes()

    await handler(makeReq({ query: { id: 'missing' } }), res)
    expect(res._status).toBe(404)
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => (table === 'profiles' ? { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: false }, error: null }) }) }) } : {}))
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res._status).toBe(403)
  })
})

const completeNutrition = { calories: 100, protein_g: 5, fat_g: 3, carbs_g: 10, fiber_g: 1, sodium_mg: 100, sugar_g: 2 }
const completeCost = { retail_low: 0.5, retail_high: 1, restaurant_low: 1, restaurant_high: 2 }

describe('enabling an ingredient', () => {
  const setupEnableChain = (stored: { data: unknown; error: unknown }) => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'ing-1', enabled: true }, error: null })
    const mockSelectAfterUpdate = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelectAfterUpdate })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    const lookup = vi.fn().mockResolvedValue(stored)
    const mockSelect = vi.fn().mockReturnValue({ eq: () => ({ single: lookup }) })
    mockFrom.mockImplementation((table: string) =>
      table === 'profiles' ? adminProfileBranch : { update: mockUpdate, select: mockSelect },
    )
    return { mockUpdate, mockSelect }
  }

  const enable = (body: Record<string, unknown> = { enabled: true }) => makeReq({ body })

  it('enables an ingredient whose stored nutrition and cost are complete', async () => {
    const { mockUpdate } = setupEnableChain({ data: { nutrition: completeNutrition, estimated_cost: completeCost }, error: null })
    const res = makeRes()

    await handler(enable(), res)

    expect(res._status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ enabled: true })
  })

  it('refuses to enable an ingredient with no nutrition data', async () => {
    const { mockUpdate } = setupEnableChain({ data: { nutrition: null, estimated_cost: completeCost }, error: null })
    const res = makeRes()

    await handler(enable(), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INCOMPLETE_INGREDIENT')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuses to enable an ingredient with no cost data', async () => {
    const { mockUpdate } = setupEnableChain({ data: { nutrition: completeNutrition, estimated_cost: null }, error: null })
    const res = makeRes()

    await handler(enable(), res)

    expect(res._status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuses to enable an ingredient whose stored nutrition is missing a value', async () => {
    const partial = { protein_g: 5, fat_g: 3, carbs_g: 10, fiber_g: 1, sodium_mg: 100, sugar_g: 2 }
    const { mockUpdate } = setupEnableChain({ data: { nutrition: partial, estimated_cost: completeCost }, error: null })
    const res = makeRes()

    await handler(enable(), res)

    expect(res._status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('enables without a lookup when the same request supplies complete nutrition and cost', async () => {
    const { mockUpdate, mockSelect } = setupEnableChain({ data: null, error: { message: 'should not be read' } })
    const res = makeRes()

    await handler(enable({ enabled: true, nutrition: completeNutrition, estimated_cost: completeCost }), res)

    expect(res._status).toBe(200)
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('refuses when the request supplies nutrition but the stored cost is missing', async () => {
    const { mockUpdate } = setupEnableChain({ data: { nutrition: null, estimated_cost: null }, error: null })
    const res = makeRes()

    await handler(enable({ enabled: true, nutrition: completeNutrition }), res)

    expect(res._status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when the ingredient to enable does not exist', async () => {
    setupEnableChain({ data: null, error: { message: 'no rows' } })
    const res = makeRes()

    await handler(enable(), res)

    expect(res._status).toBe(404)
  })

  it('never checks the data when disabling', async () => {
    const { mockUpdate, mockSelect } = setupEnableChain({ data: { nutrition: null, estimated_cost: null }, error: null })
    const res = makeRes()

    await handler(enable({ enabled: false }), res)

    expect(res._status).toBe(200)
    expect(mockSelect).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({ enabled: false })
  })

  it('never checks the data for edits that leave enabled alone', async () => {
    const { mockSelect } = setupEnableChain({ data: { nutrition: null, estimated_cost: null }, error: null })
    const res = makeRes()

    await handler(enable({ name: 'Rye' }), res)

    expect(res._status).toBe(200)
    expect(mockSelect).not.toHaveBeenCalled()
  })
})

describe('unsupported methods', () => {
  it('returns 405 for GET', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res._status).toBe(405)
  })
})
