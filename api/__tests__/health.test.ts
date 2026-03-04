import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

const makeReq = (method = 'GET'): VercelRequest =>
  ({ method }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/health', () => {
  it('returns 200 with status ok when Supabase is reachable', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ error: null }) }),
    })

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(200)
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ok' } }),
    )
  })

  it('returns 503 when Supabase returns an error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ error: { message: 'connection failed' } }) }),
    })

    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(503)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ error: { code: string } }]
    expect(jsonCall[0].error.code).toBe('DB_UNAVAILABLE')
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../health')
    const res = makeRes()
    await handler(makeReq('POST'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })
})
