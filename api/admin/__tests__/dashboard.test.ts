import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

import handleDashboard from '../_handlers/dashboard.js'

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({ method: 'GET', ...overrides }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const countResult = (count: number) => ({ select: () => Promise.resolve({ count, error: null }) })
const filteredCountResult = (count: number) => ({ select: () => ({ or: () => Promise.resolve({ count, error: null }) }) })
const eqCountResult = (count: number) => ({ select: () => ({ eq: () => Promise.resolve({ count, error: null }) }) })

const setupCounts = () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return countResult(10)
    if (table === 'saved_sandwiches') return countResult(25)
    if (table === 'shared_sandwiches') return countResult(5)
    if (table === 'ratings') return countResult(40)
    if (table === 'comments') return filteredCountResult(2)
    if (table === 'photos') return eqCountResult(3)
    throw new Error(`unexpected table ${table}`)
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/admin/dashboard', () => {
  it('returns 200 with aggregated metrics', async () => {
    setupCounts()
    const res = makeRes()

    await handleDashboard(makeReq(), res, mockSupabase as never)

    expect(res._status).toBe(200)
    expect((res._json as { data: Record<string, number> }).data).toEqual({
      total_users: 10,
      total_saved_sandwiches: 25,
      total_shared_links: 5,
      total_ratings: 40,
      pending_moderation_count: 5,
    })
  })

  it('returns 500 when any query fails', async () => {
    setupCounts()
    mockFrom.mockImplementationOnce(() => ({ select: () => Promise.resolve({ count: null, error: { message: 'db error' } }) }))
    const res = makeRes()

    await handleDashboard(makeReq(), res, mockSupabase as never)
    expect(res._status).toBe(500)
  })

  it('returns 405 for non-GET requests', async () => {
    const res = makeRes()
    await handleDashboard(makeReq({ method: 'POST' }), res, mockSupabase as never)
    expect(res._status).toBe(405)
  })
})
