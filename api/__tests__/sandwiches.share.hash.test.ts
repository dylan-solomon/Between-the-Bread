import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

const makeReq = (hash = 'abc12345'): VercelRequest =>
  ({ method: 'GET', query: { hash } }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const stubRecord = {
  hash: 'abc12345',
  name: 'The Club',
  composition: {
    bread: [{ slug: 'sourdough', name: 'Sourdough' }],
    protein: [{ slug: 'turkey', name: 'Turkey' }],
    cheese: [{ slug: 'swiss', name: 'Swiss' }],
    toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
    condiments: [{ slug: 'mustard', name: 'Mustard' }],
  },
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  created_at: new Date().toISOString(),
}

const setupMock = (data: unknown = stubRecord, error: unknown = null) => {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  })
}

beforeEach(() => mockFrom.mockReset())

describe('GET /api/sandwiches/share/:hash', () => {
  it('returns 200 with the sandwich record on success', async () => {
    setupMock()
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(200)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { hash: string; name: string; composition: unknown }
    }
    expect(body.data.hash).toBe('abc12345')
    expect(body.data.name).toBe('The Club')
    expect(body.data.composition).toEqual(stubRecord.composition)
  })

  it('returns 404 when hash is not found', async () => {
    setupMock(null, { code: 'PGRST116', message: 'not found' })
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(404)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string }
    }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 404 when the record is expired', async () => {
    setupMock({ ...stubRecord, expires_at: new Date(Date.now() - 1000).toISOString() })
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(404)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string }
    }
    expect(body.error.code).toBe('EXPIRED')
  })

  it('returns 400 when hash param is missing', async () => {
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(({ method: 'GET', query: {} }) as unknown as VercelRequest, res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400)
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(({ method: 'POST', query: { hash: 'abc12345' } }) as unknown as VercelRequest, res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })

  it('returns 500 when Supabase returns a non-PGRST116 error', async () => {
    setupMock(null, { code: 'OTHER', message: 'db error' })
    const { default: handler } = await import('../sandwiches/share/[hash]')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500)
  })
})
