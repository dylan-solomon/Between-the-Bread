import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom, mockGenerateHash, mockCheckShareRateLimit } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGenerateHash: vi.fn(),
  mockCheckShareRateLimit: vi.fn(),
}))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../_lib/hash.js', () => ({
  generateHash: mockGenerateHash,
}))

vi.mock('../_lib/rateLimit.js', () => ({
  checkShareRateLimit: mockCheckShareRateLimit,
}))

const makeReq = (method = 'POST', body: unknown = {}, headers: Record<string, string> = {}): VercelRequest =>
  ({ method, body, headers }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const stubComposition = {
  bread: [{ slug: 'sourdough', name: 'Sourdough' }],
  protein: [{ slug: 'turkey', name: 'Turkey' }],
  cheese: [{ slug: 'swiss', name: 'Swiss' }],
  toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
  condiments: [{ slug: 'mustard', name: 'Mustard' }],
}

const stubBody = {
  composition: stubComposition,
  name: 'The Club',
}

const setupInsertMock = (error: unknown = null) => {
  mockFrom.mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error }),
  })
}

beforeEach(() => {
  mockFrom.mockReset()
  mockGenerateHash.mockReturnValue('abc12345')
  mockCheckShareRateLimit.mockResolvedValue({ allowed: true })
  delete process.env.VERCEL_URL
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL
})

describe('POST /api/sandwiches/share', () => {
  it('returns 201 with hash and url on success', async () => {
    setupInsertMock()
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(201)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { hash: string; url: string }
    }
    expect(body.data.hash).toBe('abc12345')
    expect(body.data.url).toBe('https://betweenbread.co/s/abc12345')
  })

  it('uses VERCEL_PROJECT_PRODUCTION_URL when set', async () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'betweenbread.co'
    setupInsertMock()
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody), res)

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: { url: string }
    }
    expect(body.data.url).toBe('https://betweenbread.co/s/abc12345')
  })

  it('inserts a record with hash, composition, name, and expires_at', async () => {
    setupInsertMock()
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody), res)

    const mockResult = mockFrom.mock.results[0] as { value: { insert: { mock: { calls: unknown[][] } } } }
    const insertCall = mockResult.value.insert.mock.calls[0][0] as {
      hash: string
      composition: unknown
      name: string
      expires_at: string
    }
    expect(insertCall.hash).toBe('abc12345')
    expect(insertCall.composition).toEqual(stubComposition)
    expect(insertCall.name).toBe('The Club')
    expect(new Date(insertCall.expires_at).getTime()).toBeGreaterThan(Date.now())
  })

  it('returns 400 when required categories are missing from composition', async () => {
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(
      makeReq('POST', { composition: { bread: [] }, name: 'Oops' }),
      res,
    )

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string }
    }
    expect(body.error.code).toBe('INVALID_COMPOSITION')
  })

  it('returns 400 when name is missing', async () => {
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', { composition: stubComposition }), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400)
  })

  it('returns 405 for non-POST requests', async () => {
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('GET'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })

  it('returns 500 when Supabase insert fails', async () => {
    setupInsertMock({ message: 'db error' })
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string }
    }
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckShareRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 })
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(429)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      error: { code: string }
    }
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('passes client IP from x-forwarded-for header to rate limiter', async () => {
    setupInsertMock()
    const { default: handler } = await import('../sandwiches/share')
    const res = makeRes()
    await handler(makeReq('POST', stubBody, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }), res)

    expect(mockCheckShareRateLimit).toHaveBeenCalledWith('1.2.3.4')
  })
})
