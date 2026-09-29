import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const {
  mockAuthenticateAdminRequest,
  mockConfigHandler,
  mockIngredientsHandler,
  mockCompatMatrixHandler,
  mockModerationHandler,
  mockDashboardHandler,
} = vi.hoisted(() => ({
  mockAuthenticateAdminRequest: vi.fn(),
  mockConfigHandler: vi.fn(),
  mockIngredientsHandler: vi.fn(),
  mockCompatMatrixHandler: vi.fn(),
  mockModerationHandler: vi.fn(),
  mockDashboardHandler: vi.fn(),
}))

vi.mock('../../_lib/adminAuth.js', () => ({ authenticateAdminRequest: mockAuthenticateAdminRequest }))
vi.mock('../_handlers/config.js', () => ({ default: mockConfigHandler }))
vi.mock('../_handlers/ingredients.js', () => ({ default: mockIngredientsHandler }))
vi.mock('../_handlers/compatMatrix.js', () => ({ default: mockCompatMatrixHandler }))
vi.mock('../_handlers/moderation.js', () => ({ default: mockModerationHandler }))
vi.mock('../_handlers/dashboard.js', () => ({ default: mockDashboardHandler }))

import handler from '../[...path].js'

const mockSupabase = { from: vi.fn() }
const mockAuth = { supabase: mockSupabase, user: { id: 'admin-1' } }

const makeReq = (path: string[], overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({ method: 'GET', query: { path }, ...overrides }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthenticateAdminRequest.mockResolvedValue(mockAuth)
})

describe('api/admin/[...path] dispatcher', () => {
  it('returns early when admin authentication fails', async () => {
    mockAuthenticateAdminRequest.mockResolvedValue(null)
    const res = makeRes()

    await handler(makeReq(['config']), res)

    expect(mockConfigHandler).not.toHaveBeenCalled()
  })

  it('routes ["config"] to the config handler', async () => {
    const res = makeRes()
    await handler(makeReq(['config']), res)
    expect(mockConfigHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase)
  })

  it('routes ["ingredients"] to the ingredients handler with no id', async () => {
    const res = makeRes()
    await handler(makeReq(['ingredients']), res)
    expect(mockIngredientsHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase, undefined)
  })

  it('routes ["ingredients", id] to the ingredients handler with the id', async () => {
    const res = makeRes()
    await handler(makeReq(['ingredients', 'ing-1']), res)
    expect(mockIngredientsHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase, 'ing-1')
  })

  it('routes ["compat-matrix"] to the compat matrix handler', async () => {
    const res = makeRes()
    await handler(makeReq(['compat-matrix']), res)
    expect(mockCompatMatrixHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase)
  })

  it('routes ["moderation", "comments"] to the moderation handler', async () => {
    const res = makeRes()
    await handler(makeReq(['moderation', 'comments']), res)
    expect(mockModerationHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase, 'comments', undefined)
  })

  it('routes ["moderation", "photos", id] to the moderation handler with the id', async () => {
    const res = makeRes()
    await handler(makeReq(['moderation', 'photos', 'p1']), res)
    expect(mockModerationHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase, 'photos', 'p1')
  })

  it('routes ["dashboard"] to the dashboard handler', async () => {
    const res = makeRes()
    await handler(makeReq(['dashboard']), res)
    expect(mockDashboardHandler).toHaveBeenCalledWith(expect.anything(), res, mockSupabase)
  })

  it('returns 404 for an unrecognized path', async () => {
    const res = makeRes()
    await handler(makeReq(['bogus']), res)
    expect(res._status).toBe(404)
  })

  it('returns 404 when the path is empty', async () => {
    const res = makeRes()
    await handler(makeReq([]), res)
    expect(res._status).toBe(404)
  })
})
