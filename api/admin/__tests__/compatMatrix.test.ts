import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

import handleCompatMatrix from '../_handlers/compatMatrix.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({ method: 'PATCH', body: { group_a: 'italian', group_b: 'mediterranean', affinity: 0.9 }, ...overrides }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const setupUpdateChain = (error: unknown = null) => {
  const mockEqB = vi.fn().mockResolvedValue({ error })
  const mockEqA = vi.fn().mockReturnValue({ eq: mockEqB })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqA })
  mockFrom.mockReturnValue({ update: mockUpdate })
  return { mockUpdate, mockEqA, mockEqB }
}

beforeEach(() => { vi.clearAllMocks() })

describe('PATCH /api/admin/compat-matrix', () => {
  it('updates both directions of the pair with the same affinity', async () => {
    setupUpdateChain()
    const res = makeRes()

    await handleCompatMatrix(makeReq(), res, mockSupabase as never)

    expect(mockFrom).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(200)
    expect((res._json as { data: { group_a: string; group_b: string; affinity: number } }).data).toEqual({
      group_a: 'italian', group_b: 'mediterranean', affinity: 0.9,
    })
  })

  it('returns 400 for an unrecognized group', async () => {
    const res = makeRes()
    await handleCompatMatrix(makeReq({ body: { group_a: 'bogus', group_b: 'italian', affinity: 0.5 } }), res, mockSupabase as never)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_GROUP')
  })

  it('returns 400 when affinity is out of range', async () => {
    const res = makeRes()
    await handleCompatMatrix(makeReq({ body: { group_a: 'italian', group_b: 'southern', affinity: 1.5 } }), res, mockSupabase as never)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_AFFINITY')
  })

  it('returns 400 when affinity is missing', async () => {
    const res = makeRes()
    await handleCompatMatrix(makeReq({ body: { group_a: 'italian', group_b: 'southern' } }), res, mockSupabase as never)
    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('INVALID_AFFINITY')
  })

  it('returns 500 when updating either direction fails', async () => {
    setupUpdateChain({ message: 'db error' })
    const res = makeRes()

    await handleCompatMatrix(makeReq(), res, mockSupabase as never)
    expect(res._status).toBe(500)
  })

  it('returns 405 for non-PATCH requests', async () => {
    const res = makeRes()
    await handleCompatMatrix(makeReq({ method: 'GET' }), res, mockSupabase as never)
    expect(res._status).toBe(405)
  })
})
