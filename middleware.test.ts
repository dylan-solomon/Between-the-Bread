import { describe, it, expect, vi, beforeEach } from 'vitest'
import middleware from './middleware'

const makeRequest = (path: string) =>
  new Request(`https://betweenbread.co${path}`)

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('OG middleware', () => {
  it('passes through non-share routes unchanged', async () => {
    const res = await middleware(makeRequest('/about'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through API routes unchanged', async () => {
    const res = await middleware(makeRequest('/api/sandwiches/share'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('fetches the share record and injects OG tags for /s/:hash routes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { hash: 'abc12345', name: 'The Club', composition: {} } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response('<html><head></head><body>app</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      )

    const res = await middleware(makeRequest('/s/abc12345'))
    const html = await res.text()

    expect(html).toContain('og:title')
    expect(html).toContain('The Club')
    expect(html).toContain('/s/abc12345')
  })

  it('passes through when the share API returns non-200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }))

    const res = await middleware(makeRequest('/s/abc12345'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))

    const res = await middleware(makeRequest('/s/abc12345'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('only activates for paths matching /s/:hash (8 alphanumeric chars)', async () => {
    const res = await middleware(makeRequest('/s/toolong123'))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})
