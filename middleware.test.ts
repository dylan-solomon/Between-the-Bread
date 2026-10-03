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

const shellWithStaticTags = `<html><head>
    <title>Between the Bread</title>
    <meta property="og:title" content="Generic title" />
    <meta
      property="og:description"
      content="Generic description"
    />
    <meta property="og:image" content="https://betweenbread.co/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Generic title" />
    <meta name="twitter:image" content="https://betweenbread.co/og-image.png" />
    <meta name="description" content="Keep me" />
  </head><body>app</body></html>`

const mockShareAndShell = (shell = shellWithStaticTags) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { hash: 'abc12345', name: 'The Club' } }), { status: 200 }),
    )
    .mockResolvedValueOnce(new Response(shell, { status: 200 }))
}

const count = (html: string, text: string): number => html.split(text).length - 1

describe('Twitter cards for shared sandwiches', () => {
  it('adds a large image card with the sandwich name and generated image', async () => {
    mockShareAndShell()

    const html = await (await middleware(makeRequest('/s/abc12345'))).text()

    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('<meta name="twitter:title" content="The Club" />')
    expect(html).toContain('<meta name="twitter:image" content="https://betweenbread.co/api/og/sandwich/abc12345" />')
  })

  it('replaces the generic tags from the page shell instead of duplicating them', async () => {
    mockShareAndShell()

    const html = await (await middleware(makeRequest('/s/abc12345'))).text()

    expect(html).not.toContain('Generic title')
    expect(html).not.toContain('Generic description')
    expect(html).not.toContain('og-image.png')
    expect(count(html, 'property="og:title"')).toBe(1)
    expect(count(html, 'property="og:image"')).toBe(1)
    expect(count(html, 'name="twitter:card"')).toBe(1)
    expect(count(html, 'name="twitter:image"')).toBe(1)
  })

  it('keeps unrelated tags from the page shell', async () => {
    mockShareAndShell()

    const html = await (await middleware(makeRequest('/s/abc12345'))).text()

    expect(html).toContain('<meta name="description" content="Keep me" />')
  })
})

describe('Twitter cards for encyclopedia entries', () => {
  it('adds a large image card with the entry title, description and image', async () => {
    mockEntryAndShell()

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('<meta name="twitter:title" content="Reuben" />')
    expect(html).toContain('<meta name="twitter:description" content="Corned beef and sauerkraut on rye." />')
    expect(html).toContain('<meta name="twitter:image" content="https://example.com/reuben.jpg" />')
  })

  it('uses a plain summary card with no image when the entry has none', async () => {
    mockEntryAndShell({ data: { name: 'Reuben', slug: 'reuben', description: null, image_url: null } })

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).toContain('<meta name="twitter:card" content="summary" />')
    expect(html).not.toContain('twitter:image')
    expect(html).not.toContain('twitter:description')
  })

  it('replaces the generic tags from the page shell instead of duplicating them', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(reubenEntry), { status: 200 }))
      .mockResolvedValueOnce(new Response(shellWithStaticTags, { status: 200 }))

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).not.toContain('Generic title')
    expect(html).not.toContain('og-image.png')
    expect(count(html, 'property="og:image"')).toBe(1)
    expect(count(html, 'name="twitter:title"')).toBe(1)
  })

  it('escapes special characters in the Twitter tags', async () => {
    mockEntryAndShell({
      data: { name: 'Reuben "Classic"', slug: 'reuben', description: '<script>x</script>', image_url: null },
    })

    const html = await (await middleware(makeRequest('/sandwiches/reuben'))).text()

    expect(html).not.toContain('<script>')
    expect(html).toContain('<meta name="twitter:title" content="Reuben &quot;Classic&quot;" />')
  })
})

const hello = {
  id: 'p-1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds that skip the meat.',
  body: 'Body.',
  author_name: 'Dylan',
  reading_time_minutes: 3,
  meta_description: null,
  cover_image_url: 'https://cdn.example.com/cover.jpg',
  published_at: '2026-10-01T12:00:00.000Z',
  updated_at: '2026-10-02T12:00:00.000Z',
  categories: [],
  related_sandwiches: [],
  more_posts: [],
}

const mockPostAndShell = (overrides: Record<string, unknown> = {}, shell = shellWithStaticTags) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...hello, ...overrides } }), { status: 200 }))
    .mockResolvedValueOnce(new Response(shell, { status: 200 }))
}

describe('OG middleware for blog posts', () => {
  it('looks the post up by slug', async () => {
    mockPostAndShell()

    await middleware(makeRequest('/blog/vegan-builds'))

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://betweenbread.co/api/blog/vegan-builds')
  })

  it('injects the title, description, image, url, type and publish time', async () => {
    mockPostAndShell()

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(html).toContain('<title>Vegan builds | Between the Bread</title>')
    expect(html).toContain('<meta property="og:title" content="Vegan builds" />')
    expect(html).toContain('<meta property="og:description" content="Five builds that skip the meat." />')
    expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/cover.jpg" />')
    expect(html).toContain('<meta property="og:url" content="https://betweenbread.co/blog/vegan-builds" />')
    expect(html).toContain('<meta property="og:type" content="article" />')
    expect(html).toContain('<meta property="article:published_time" content="2026-10-01T12:00:00.000Z" />')
  })

  it('prefers the meta description over the excerpt', async () => {
    mockPostAndShell({ meta_description: 'Written for search engines.' })

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(html).toContain('<meta property="og:description" content="Written for search engines." />')
    expect(html).not.toContain('Five builds that skip the meat.')
  })

  it('uses a large image card when the post has a cover image', async () => {
    mockPostAndShell()

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('<meta name="twitter:title" content="Vegan builds" />')
    expect(html).toContain('<meta name="twitter:description" content="Five builds that skip the meat." />')
    expect(html).toContain('<meta name="twitter:image" content="https://cdn.example.com/cover.jpg" />')
  })

  it('uses a plain summary card and no image when the post has no cover image', async () => {
    mockPostAndShell({ cover_image_url: null })

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(html).toContain('<meta name="twitter:card" content="summary" />')
    expect(html).not.toContain('og:image')
    expect(html).not.toContain('twitter:image')
  })

  it('replaces the generic tags from the page shell instead of duplicating them', async () => {
    mockPostAndShell()

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(count(html, 'og:title')).toBe(1)
    expect(count(html, 'og:image"')).toBe(1)
    expect(count(html, 'twitter:card')).toBe(1)
    expect(count(html, '<title>')).toBe(1)
    expect(html).not.toContain('Keep me')
  })

  it('escapes special characters so post text cannot break out of the tags', async () => {
    mockPostAndShell({ title: `It's "great" <b>`, excerpt: '"><script>alert(1)</script>' })

    const html = await (await middleware(makeRequest('/blog/vegan-builds'))).text()

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('It&#39;s &quot;great&quot; &lt;b&gt;')
  })

  it('passes through when the post does not exist or is not live yet', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }))

    const res = await middleware(makeRequest('/blog/nope'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))

    const res = await middleware(makeRequest('/blog/vegan-builds'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through for the blog index, the feed and malformed slugs without fetching', async () => {
    const index = await middleware(makeRequest('/blog'))
    const feed = await middleware(makeRequest('/blog/rss.xml'))
    const malformed = await middleware(makeRequest('/blog/Not_A_Slug'))

    expect(index.headers.get('x-middleware-next')).toBe('1')
    expect(feed.headers.get('x-middleware-next')).toBe('1')
    expect(malformed.headers.get('x-middleware-next')).toBe('1')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is registered for blog post paths', () => {
    expect(config.matcher).toContain('/blog/:slug')
  })
})

const categoriesResponse = {
  data: [
    { slug: 'dietary', name: 'Dietary', description: 'Vegan, gluten-free and more.', post_count: 2 },
    { slug: 'best-pairings', name: 'Best Pairings', description: null, post_count: 0 },
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, post_count: 1 },
  ],
}

const mockCategoriesAndShell = (shell = shellWithStaticTags) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify(categoriesResponse), { status: 200 }))
    .mockResolvedValueOnce(new Response(shell, { status: 200 }))
}

describe('OG middleware for blog category pages', () => {
  it('looks the category up in the category list', async () => {
    mockCategoriesAndShell()

    await middleware(makeRequest('/blog/category/dietary'))

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://betweenbread.co/api/blog/categories')
  })

  it('injects the title, description, url and a plain summary card', async () => {
    mockCategoriesAndShell()

    const html = await (await middleware(makeRequest('/blog/category/dietary'))).text()

    expect(html).toContain('<title>Dietary | Blog | Between the Bread</title>')
    expect(html).toContain('<meta property="og:title" content="Dietary | Blog | Between the Bread" />')
    expect(html).toContain('<meta property="og:description" content="Vegan, gluten-free and more." />')
    expect(html).toContain('<meta property="og:url" content="https://betweenbread.co/blog/category/dietary" />')
    expect(html).toContain('<meta property="og:type" content="website" />')
    expect(html).toContain('<meta name="twitter:card" content="summary" />')
    expect(html).not.toContain('og:image')
  })

  it('writes a description when the category has none', async () => {
    mockCategoriesAndShell()

    const html = await (await middleware(makeRequest('/blog/category/sandwich-ideas'))).text()

    expect(html).toContain('<meta property="og:description" content="Sandwich Ideas posts from Between the Bread." />')
  })

  it('replaces the generic tags from the page shell instead of duplicating them', async () => {
    mockCategoriesAndShell()

    const html = await (await middleware(makeRequest('/blog/category/dietary'))).text()

    expect(count(html, 'og:title')).toBe(1)
    expect(count(html, 'twitter:card')).toBe(1)
    expect(count(html, '<title>')).toBe(1)
  })

  it.each([
    ['a category that does not exist', '/blog/category/made-up'],
    ['a category with no live posts', '/blog/category/best-pairings'],
  ])('passes through for %s', async (_label, path) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(categoriesResponse), { status: 200 }))

    const res = await middleware(makeRequest(path))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('passes through when the category list cannot be loaded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }))

    const res = await middleware(makeRequest('/blog/category/dietary'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('escapes special characters in the category text', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ slug: 'dietary', name: '"Diet" <b>', description: null, post_count: 1 }] }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(shellWithStaticTags, { status: 200 }))

    const html = await (await middleware(makeRequest('/blog/category/dietary'))).text()

    expect(html).not.toContain('<b>')
    expect(html).toContain('&quot;Diet&quot; &lt;b&gt;')
  })

  it('is registered for blog category paths', () => {
    expect(config.matcher).toContain('/blog/category/:slug')
  })
})
