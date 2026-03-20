import { describe, it, expect, vi, beforeEach } from 'vitest'

const { MockImageResponse } = vi.hoisted(() => ({
  MockImageResponse: class {
    readonly status = 200
    readonly headers = { get: (name: string) => (name === 'content-type' ? 'image/png' : null) }
  },
}))

vi.mock('@vercel/og', () => ({ ImageResponse: MockImageResponse }))

const makeRequest = (hash: string, method = 'GET') =>
  new Request(`https://betweenbread.co/api/og/sandwich/${hash}`, { method })

const makeShareResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const stubData = {
  hash: 'abc12345',
  name: 'The Club',
  composition: {
    bread: [{ slug: 'sourdough', name: 'Sourdough' }],
    protein: [{ slug: 'turkey', name: 'Turkey' }],
    cheese: [{ slug: 'swiss', name: 'Swiss' }],
    toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
    condiments: [{ slug: 'mayo', name: 'Mayo' }],
  },
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('GET /api/og/sandwich/:hash', () => {
  it('returns an image/png response for a valid hash', async () => {
    vi.mocked(fetch).mockResolvedValue(makeShareResponse(stubData))
    const { default: handler } = await import('../og/sandwich/[hash]')
    const res = await handler(makeRequest('abc12345'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
  })

  it('returns 404 when the share API returns non-200', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))
    const { default: handler } = await import('../og/sandwich/[hash]')
    const res = await handler(makeRequest('abc12345'))
    expect(res.status).toBe(404)
  })

  it('returns 400 when hash is empty', async () => {
    const { default: handler } = await import('../og/sandwich/[hash]')
    const res = await handler(new Request('https://betweenbread.co/api/og/sandwich/'))
    expect(res.status).toBe(400)
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../og/sandwich/[hash]')
    const res = await handler(makeRequest('abc12345', 'POST'))
    expect(res.status).toBe(405)
  })

  it('returns 500 when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    const { default: handler } = await import('../og/sandwich/[hash]')
    const res = await handler(makeRequest('abc12345'))
    expect(res.status).toBe(500)
  })
})
