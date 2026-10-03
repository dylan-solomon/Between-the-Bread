import { describe, it, expect, vi, beforeEach } from 'vitest'
import middleware from './middleware'

const makeRequest = (path: string) => new Request(`https://betweenbread.co${path}`)

const shell = `<!doctype html>
<html lang="en">
  <head>
    <title>Between the Bread — Random Sandwich Generator</title>
    <meta
      name="description"
      content="Generic description"
    />
    <link rel="stylesheet" href="/assets/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`

const post = {
  id: 'p-1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds that skip the meat.',
  body: 'Start here.\n\n## Why it works\n\nBecause **cheese** melts. See [the Reuben](/sandwiches/reuben).\n\n### A detail\n\nMore.',
  cover_image_url: 'https://cdn.example.com/cover.jpg',
  author_name: 'Dylan',
  meta_description: null,
  reading_time_minutes: 3,
  published_at: '2026-10-01T12:00:00.000Z',
  updated_at: '2026-10-02T12:00:00.000Z',
  categories: [
    { slug: 'dietary', name: 'Dietary' },
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
  ],
  related_sandwiches: [
    { name: 'Cubano', slug: 'cubano', image_url: null, description: 'Pressed pork and ham.' },
  ],
  more_posts: [
    {
      slug: 'grilled-cheese',
      title: 'Grilled cheese',
      excerpt: 'Melt it right.',
      cover_image_url: null,
      author_name: 'Dylan',
      published_at: '2026-09-01T12:00:00.000Z',
      reading_time_minutes: 2,
      categories: [],
    },
  ],
}

const respondWith = (data: Record<string, unknown>) => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(JSON.stringify({ data }), { status: 200 }))
    .mockResolvedValueOnce(new Response(shell, { status: 200 }))
}

const pageFor = async (path: string, data: Record<string, unknown>): Promise<string> => {
  respondWith(data)
  return (await middleware(makeRequest(path))).text()
}

const count = (html: string, text: string): number => html.split(text).length - 1

const rootContent = (html: string): string => {
  const start = html.indexOf('<div id="root">') + '<div id="root">'.length
  return html.slice(start, html.indexOf('\n    <script', start))
}

const headContent = (html: string): string => html.slice(html.indexOf('<head>'), html.indexOf('</head>'))

const initialData = (html: string): unknown => {
  const match = /<script type="application\/json" id="initial-data">(.*?)<\/script>/s.exec(html)
  return match === null ? undefined : JSON.parse(match[1])
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('Blog posts in the first response', () => {
  it('writes the post title as the only top-level heading', async () => {
    const html = await pageFor('/blog/vegan-builds', post)

    expect(rootContent(html)).toMatch(/<h1[^>]*>Vegan builds<\/h1>/)
    expect(count(html, '<h1')).toBe(1)
  })

  it('writes the byline, date and reading time', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toContain('By Dylan')
    expect(root).toContain('<time datetime="2026-10-01T12:00:00.000Z">Oct 1, 2026</time>')
    expect(root).toContain('3 min read')
  })

  it('writes the body with its section headings, formatting and links', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toContain('<h2>Why it works</h2>')
    expect(root).toContain('<h3>A detail</h3>')
    expect(root).toContain('<strong>cheese</strong>')
    expect(root).toContain('<a href="/sandwiches/reuben">the Reuben</a>')
  })

  it('shows code typed into the body as text instead of running it', async () => {
    const root = rootContent(
      await pageFor('/blog/vegan-builds', { ...post, body: 'Hi <img src=x onerror=alert(1)> [x](javascript:alert(1))' }),
    )

    expect(root).not.toContain('<img src=x')
    expect(root).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(root).not.toContain('javascript:')
  })

  it('writes the cover image', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toContain('<img src="https://cdn.example.com/cover.jpg"')
  })

  it('leaves out the cover image when the post has none', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', { ...post, cover_image_url: null }))

    expect(root).not.toContain('cdn.example.com/cover.jpg')
  })

  it('links to the post categories, its sandwiches and more posts', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toMatch(/<a href="\/blog\/category\/dietary"[^>]*>Dietary<\/a>/)
    expect(root).toMatch(/<a href="\/blog\/category\/sandwich-ideas"[^>]*>Sandwich Ideas<\/a>/)
    expect(root).toMatch(/<h2[^>]*>Sandwiches in this post<\/h2>/)
    expect(root).toMatch(/<a href="\/sandwiches\/cubano"[^>]*>/)
    expect(root).toContain('Cubano')
    expect(root).toMatch(/<h2[^>]*>More from the blog<\/h2>/)
    expect(root).toMatch(/<a href="\/blog\/grilled-cheese"[^>]*>/)
    expect(root).toContain('Grilled cheese')
  })

  it('leaves out the sandwich and more-posts sections when there are none', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', { ...post, related_sandwiches: [], more_posts: [] }))

    expect(root).not.toContain('Sandwiches in this post')
    expect(root).not.toContain('More from the blog')
  })

  it('writes the site header with links to the encyclopedia and the blog', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toMatch(/<header[^>]*>/)
    expect(root).toMatch(/<a href="\/sandwiches"[^>]*>Sandwiches<\/a>/)
    expect(root).toMatch(/<a href="\/blog"[^>]*>Blog<\/a>/)
    expect(root).toMatch(/<main[^>]*>/)
  })

  it('escapes special characters in the post text', async () => {
    const root = rootContent(
      await pageFor('/blog/vegan-builds', { ...post, title: 'It\'s "great" <b>', author_name: '<i>Me</i>' }),
    )

    expect(root).not.toContain('<b>')
    expect(root).not.toContain('<i>Me')
    expect(root).toContain('It&#39;s &quot;great&quot; &lt;b&gt;')
  })

  it('keeps the page scripts and styles so the app still loads', async () => {
    const html = await pageFor('/blog/vegan-builds', post)

    expect(html).toContain('<link rel="stylesheet" href="/assets/index.css">')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
  })
})

describe('Blog post search tags in the first response', () => {
  it('replaces the generic description with the post excerpt', async () => {
    const head = headContent(await pageFor('/blog/vegan-builds', post))

    expect(head).toContain('<meta name="description" content="Five builds that skip the meat." data-rh="true" />')
    expect(head).not.toContain('Generic description')
    expect(count(head, 'name="description"')).toBe(1)
  })

  it('uses the meta description when the post has one', async () => {
    const head = headContent(await pageFor('/blog/vegan-builds', { ...post, meta_description: 'Written for search.' }))

    expect(head).toContain('<meta name="description" content="Written for search." data-rh="true" />')
  })

  it('names the canonical address of the post', async () => {
    const head = headContent(await pageFor('/blog/vegan-builds', post))

    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/blog/vegan-builds" data-rh="true" />')
  })

  it('describes the post as a BlogPosting for search engines', async () => {
    const head = headContent(await pageFor('/blog/vegan-builds', post))
    const match = /<script type="application\/ld\+json" data-rh="true">(.*?)<\/script>/s.exec(head)

    expect(match).not.toBeNull()
    expect(JSON.parse(match?.[1] ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Vegan builds',
      description: 'Five builds that skip the meat.',
      image: 'https://cdn.example.com/cover.jpg',
      datePublished: '2026-10-01T12:00:00.000Z',
      dateModified: '2026-10-02T12:00:00.000Z',
      author: { '@type': 'Person', name: 'Dylan' },
      publisher: { '@type': 'Organization', name: 'Between the Bread' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://betweenbread.co/blog/vegan-builds' },
    })
  })

  it('keeps post text from closing the structured data early', async () => {
    const head = headContent(await pageFor('/blog/vegan-builds', { ...post, title: '</script><script>alert(1)</script>' }))

    expect(head).not.toContain('</script><script>alert(1)')
    expect(head).toContain('\\u003c/script>')
  })
})

describe('Blog post content handed to the app', () => {
  it('includes the post so the app can show it without loading it again', async () => {
    const html = await pageFor('/blog/vegan-builds', post)

    expect(initialData(html)).toEqual({ path: '/blog/vegan-builds', data: post })
  })

  it('keeps post text from closing the hand-off early', async () => {
    const html = await pageFor('/blog/vegan-builds', { ...post, body: '</script><script>alert(1)</script>' })

    expect(html).not.toContain('</script><script>alert(1)')
    expect(initialData(html)).toEqual({
      path: '/blog/vegan-builds',
      data: { ...post, body: '</script><script>alert(1)</script>' },
    })
  })

  it('serves the page as usual when the post data is incomplete', async () => {
    respondWith({ slug: 'vegan-builds', title: 'Vegan builds', excerpt: 'Short.' })

    const res = await middleware(makeRequest('/blog/vegan-builds'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})
