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

import handler from '../config.js'

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

const setupAdminCheck = (isAdmin = true) => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) }) }) }
    }
    throw new Error(`unexpected table in this test: ${table}`)
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/config', () => {
  it('returns 200 with all config rows', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) }
      return { select: () => Promise.resolve({ data: [{ key: 'site_notice', value: null }], error: null }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toHaveLength(1)
  })

  it('returns 403 when the user is not an admin', async () => {
    setupAdminCheck(false)
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(401)
  })

  it('returns 500 when the query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) }
      return { select: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(500)
  })
})

describe('PATCH /api/admin/config', () => {
  const setupUpdateChain = () => {
    const mockSingle = vi.fn()
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: true }, error: null }) }) }) }
      return { update: mockUpdate }
    })
    return { mockUpdate, mockEq, mockSingle }
  }

  it('updates the value for a given key', async () => {
    const { mockUpdate, mockEq, mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: { key: 'site_notice', value: 'Hello' }, error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'PATCH', body: { key: 'site_notice', value: 'Hello' } }), res)

    expect(mockUpdate).toHaveBeenCalledWith({ value: 'Hello' })
    expect(mockEq).toHaveBeenCalledWith('key', 'site_notice')
    expect(res._status).toBe(200)
  })

  it('allows setting a value to null', async () => {
    const { mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: { key: 'site_notice', value: null }, error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'PATCH', body: { key: 'site_notice', value: null } }), res)

    expect(res._status).toBe(200)
  })

  it('returns 400 when key is missing', async () => {
    setupAdminCheck()
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { value: 'Hello' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_KEY')
  })

  it('returns 400 when value is missing from the body', async () => {
    setupAdminCheck()
    const res = makeRes()
    await handler(makeReq({ method: 'PATCH', body: { key: 'site_notice' } }), res)

    expect(res._status).toBe(400)
    expect((res._json as { error: { code: string } }).error.code).toBe('MISSING_VALUE')
  })

  it('returns 404 when the key does not exist', async () => {
    const { mockSingle } = setupUpdateChain()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } })
    const res = makeRes()

    await handler(makeReq({ method: 'PATCH', body: { key: 'nonexistent', value: 'x' } }), res)

    expect(res._status).toBe(404)
  })
})

describe('unsupported methods', () => {
  it('returns 405 for DELETE', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'DELETE' }), res)
    expect(res._status).toBe(405)
  })
})
