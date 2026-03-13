import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

const makeReq = (method = 'GET'): VercelRequest =>
  ({ method, query: {} }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const stubRows = [
  { group_a: 'italian', group_b: 'mediterranean', affinity: 0.85 },
  { group_a: 'american', group_b: 'italian', affinity: 0.50 },
]

const setupMock = (rows = stubRows, error: unknown = null) => {
  mockFrom.mockImplementation(() => ({
    select: () => Promise.resolve({ data: rows, error }),
  }))
}

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/compat-matrix', () => {
  it('returns 200 with a data array', async () => {
    setupMock()
    const { default: handler } = await import('../compat-matrix')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(200)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: unknown[] }]
    expect(Array.isArray(jsonCall[0].data)).toBe(true)
  })

  it('meta.row_count matches the length of the data array', async () => {
    setupMock()
    const { default: handler } = await import('../compat-matrix')
    const res = makeRes()
    await handler(makeReq(), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: unknown[]; meta: { row_count: number } }]
    expect(jsonCall[0].meta.row_count).toBe(jsonCall[0].data.length)
  })

  it('returns each row with group_a, group_b, and affinity', async () => {
    setupMock()
    const { default: handler } = await import('../compat-matrix')
    const res = makeRes()
    await handler(makeReq(), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: Array<Record<string, unknown>> }]
    const row = jsonCall[0].data[0]
    expect(row).toHaveProperty('group_a')
    expect(row).toHaveProperty('group_b')
    expect(row).toHaveProperty('affinity')
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../compat-matrix')
    const res = makeRes()
    await handler(makeReq('POST'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })

  it('returns 500 when Supabase returns an error', async () => {
    setupMock([], { message: 'db error' })
    const { default: handler } = await import('../compat-matrix')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ error: { code: string } }]
    expect(jsonCall[0].error.code).toBe('INTERNAL_ERROR')
  })
})
