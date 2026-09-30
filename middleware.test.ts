import { describe, it, expect, vi, beforeEach } from 'vitest'
import middleware, { config } from './middleware'

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
    expect(html).toContain('og:image')
    expect(html).toContain('/api/og/sandwich/abc12345')
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

  it('escapes special characters in the shared sandwich name', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { hash: 'abc12345', name: 'The "Big" <b>One</b>' } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('<html><head></head><body>app</body></html>', { status: 200 }))

    const html = await (await middleware(makeRequest('/s/abc12345'))).text()

    expect(html).not.toContain('<b>One</b>')
    expect(html).toContain('&quot;Big&quot;')
  })
})

const reubenEntry = {
  data: {
    name: 'Reuben',
    slug: 'reuben',
    description: 'Corned beef and sauerkraut on rye.',
    image_url: 'https://example.com/reuben.jpg',
  },
}

const mockEntryAndShell = (entry: unknown = reubenEntry) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify(entry), { status: 200 }))
    .mockResolvedValueOnce(new Response('<html><head></head><body>app</body></html>', { status: 200 }))
}

describe('OG middleware for encyclopedia entries', () => {
  it('looks up the entry by slug', async () => {
    mockEntryAndShell()

    await middleware(makeRequest('/sandwiches/reuben'))

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://betweenbread.co/api/database/reuben')
  })

  it('injects the entry title, description, image, url and type', async () => {
    mockEntryAndShell()

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).toContain('<title>Reuben | Between the Bread</title>')
    expect(html).toContain('<meta property="og:title" content="Reuben" />')
    expect(html).toContain('<meta property="og:description" content="Corned beef and sauerkraut on rye." />')
    expect(html).toContain('<meta property="og:image" content="https://example.com/reuben.jpg" />')
    expect(html).toContain('<meta property="og:url" content="https://betweenbread.co/sandwiches/reuben" />')
    expect(html).toContain('<meta property="og:type" content="article" />')
  })

  it('leaves out the description and image when the entry has none', async () => {
    mockEntryAndShell({ data: { name: 'Reuben', slug: 'reuben', description: null, image_url: null } })

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).not.toContain('og:description')
    expect(html).not.toContain('og:image')
  })

  it('escapes special characters so entry text cannot break out of the tags', async () => {
    mockEntryAndShell({
      data: { name: `Reuben's "Classic"`, slug: 'reuben', description: '"><script>alert(1)</script>', image_url: null },
    })

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).not.toContain('<script>')
    expect(html).toContain('Reuben&#39;s &quot;Classic&quot;')
  })

  it('passes through when the entry does not exist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }))

    const res = await middleware(makeRequest('/sandwiches/nope'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))

    const res = await middleware(makeRequest('/sandwiches/reuben'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through for the index page and malformed slugs without fetching', async () => {
    const index = await middleware(makeRequest('/sandwiches'))
    const malformed = await middleware(makeRequest('/sandwiches/Not_A_Slug'))

    expect(index.headers.get('x-middleware-next')).toBe('1')
    expect(malformed.headers.get('x-middleware-next')).toBe('1')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is registered for encyclopedia entry paths', () => {
    expect(config.matcher).toContain('/sandwiches/:slug')
  })
})
