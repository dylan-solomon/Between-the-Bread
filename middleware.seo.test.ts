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
    expect(root).toMatch(/<a href="\/"[^>]*>Between the Bread<\/a><nav aria-label="Main"/)
    expect(root).toMatch(/<a href="\/sandwiches"[^>]*>Sandwiches<\/a>/)
    expect(root).toMatch(/<a href="\/community"[^>]*>Community<\/a>/)
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

const entry = {
  id: 's-1',
  name: 'Reuben',
  slug: 'reuben',
  alternative_names: ['Reuben sandwich'],
  description: 'Corned beef and sauerkraut on rye.',
  history: 'Created in **Omaha**.\n\n## Disputed origins\n\nOr New York.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: {
    protein: [{ name: 'Corned Beef' }],
    bread: [{ name: 'Rye Bread' }],
    cheese: [{ name: 'Swiss' }],
    mystery: [{ name: 'Unknown' }],
  },
  dietary_tags: ['contains_pork', 'not_a_tag'],
  image_url: 'https://cdn.example.com/reuben.jpg',
  avg_rating: 4.5,
  rating_count: 12,
  comment_count: 3,
  photo_count: 0,
  blog_posts: [
    {
      slug: 'best-reubens',
      title: 'Best Reubens',
      excerpt: 'Ranked.',
      cover_image_url: null,
      published_at: '2026-10-01T12:00:00.000Z',
      reading_time_minutes: 4,
    },
  ],
}

describe('Encyclopedia entries in the first response', () => {
  it('writes the sandwich name as the only top-level heading', async () => {
    const html = await pageFor('/sandwiches/reuben', entry)

    expect(rootContent(html)).toMatch(/<h1[^>]*>Reuben<\/h1>/)
    expect(count(html, '<h1')).toBe(1)
  })

  it('writes the origin, other names, description and history', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toContain('United States · Americas')
    expect(root).toContain('Also known as: Reuben sandwich')
    expect(root).toContain('Corned beef and sauerkraut on rye.')
    expect(root).toContain('Created in <strong>Omaha</strong>.')
    expect(root).toContain('<h2>Disputed origins</h2>')
  })

  it('lists the ingredients under their category names in sandwich order', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toMatch(/<h2[^>]*>Ingredients<\/h2>/)
    const bread = root.indexOf('>Bread</dt>')
    const protein = root.indexOf('>Protein</dt>')
    const cheese = root.indexOf('>Cheese</dt>')
    expect(bread).toBeGreaterThan(-1)
    expect(protein).toBeGreaterThan(bread)
    expect(cheese).toBeGreaterThan(protein)
    expect(root).toContain('Rye Bread')
    expect(root).toContain('Corned Beef')
    expect(root).not.toContain('Unknown')
  })

  it('shows known dietary tags with the reminder about labels', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toContain('Contains Pork')
    expect(root).not.toContain('not_a_tag')
    expect(root).toContain('always check labels')
  })

  it('leaves out the dietary section when the entry has no tags', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', { ...entry, dietary_tags: [] }))

    expect(root).not.toContain('always check labels')
  })

  it('shows the average rating', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toContain('Rated 4.5 out of 5 from 12 ratings')
  })

  it('says when the entry has no ratings yet', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', { ...entry, avg_rating: null, rating_count: 0 }))

    expect(root).toContain('No ratings yet')
  })

  it('shows the entry image', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toContain('<img src="https://cdn.example.com/reuben.jpg" alt="Reuben"')
  })

  it('shows a placeholder when the entry has no image', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', { ...entry, image_url: null }))

    expect(root).not.toContain('<img')
    expect(root).toContain('aria-label="No image available"')
  })

  it('links to the blog posts that mention the sandwich', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toMatch(/<h2[^>]*>From the blog<\/h2>/)
    expect(root).toMatch(/<a href="\/blog\/best-reubens"[^>]*>Best Reubens<\/a>/)
  })

  it('leaves out the blog section when no post mentions the sandwich', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', { ...entry, blog_posts: [] }))

    expect(root).not.toContain('From the blog')
  })

  it('leaves out lines the entry has no text for', async () => {
    const root = rootContent(
      await pageFor('/sandwiches/reuben', {
        ...entry,
        alternative_names: [],
        description: null,
        history: null,
        origin_country: null,
        origin_region: null,
      }),
    )

    expect(root).not.toContain('Also known as')
    expect(root).not.toContain('United States')
    expect(root).not.toContain('Omaha')
  })

  it('escapes special characters in the entry text', async () => {
    const root = rootContent(
      await pageFor('/sandwiches/reuben', {
        ...entry,
        name: 'Reuben <b>',
        description: '"><script>alert(1)</script>',
        canonical_ingredients: { bread: [{ name: '<i>Rye</i>' }] },
      }),
    )

    expect(root).not.toContain('<b>')
    expect(root).not.toContain('<script>alert')
    expect(root).not.toContain('<i>Rye')
    expect(root).toContain('Reuben &lt;b&gt;')
  })

  it('writes the site header', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toMatch(/<a href="\/sandwiches"[^>]*>Sandwiches<\/a>/)
  })
})

describe('Encyclopedia entry search tags in the first response', () => {
  it('replaces the generic description with the entry description', async () => {
    const head = headContent(await pageFor('/sandwiches/reuben', entry))

    expect(head).toContain('<meta name="description" content="Corned beef and sauerkraut on rye." data-rh="true" />')
    expect(count(head, 'name="description"')).toBe(1)
  })

  it('writes a description when the entry has none', async () => {
    const head = headContent(await pageFor('/sandwiches/reuben', { ...entry, description: null }))

    expect(head).toContain(
      '<meta name="description" content="The Reuben: its history, origin and ingredients." data-rh="true" />',
    )
  })

  it('names the canonical address of the entry', async () => {
    const head = headContent(await pageFor('/sandwiches/reuben', entry))

    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/sandwiches/reuben" data-rh="true" />')
  })
})

describe('Encyclopedia entry content handed to the app', () => {
  it('includes the entry so the app can show it without loading it again', async () => {
    const html = await pageFor('/sandwiches/reuben', entry)

    expect(initialData(html)).toEqual({ path: '/sandwiches/reuben', data: entry })
  })

  it('serves the page as usual when the entry data is incomplete', async () => {
    respondWith({ name: 'Reuben', slug: 'reuben' })

    const res = await middleware(makeRequest('/sandwiches/reuben'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

type Routes = Record<string, unknown>

const respondByAddress = (routes: Routes) => {
  vi.mocked(fetch).mockImplementation((input) => {
    const address = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const path = address.replace('https://betweenbread.co', '')
    if (path === '/') return Promise.resolve(new Response(shell, { status: 200 }))
    return Promise.resolve(
      path in routes ? new Response(JSON.stringify(routes[path]), { status: 200 }) : new Response(null, { status: 404 }),
    )
  })
}

const summary = (name: string, slug: string) => ({
  name,
  slug,
  alternative_names: [],
  description: `${name} description.`,
  origin_country: 'United States',
  origin_region: 'Americas',
  image_url: null,
  avg_rating: null,
  rating_count: 0,
  dietary_tags: [],
  canonical_ingredients: {},
})

const sandwichList = {
  data: [summary('Banh Mi', 'banh-mi'), summary('Reuben', 'reuben')],
  meta: { total_count: 30 },
}

describe('Encyclopedia list in the first response', () => {
  it('asks for the first page of 24 sandwiches in name order', async () => {
    respondByAddress({ '/api/database?limit=24&offset=0': sandwichList })

    await middleware(makeRequest('/sandwiches'))

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://betweenbread.co/api/database?limit=24&offset=0')
  })

  it('writes the heading and a link to every sandwich on the first page', async () => {
    respondByAddress({ '/api/database?limit=24&offset=0': sandwichList })

    const root = rootContent(await (await middleware(makeRequest('/sandwiches'))).text())

    expect(root).toMatch(/<h1[^>]*>Sandwich Encyclopedia<\/h1>/)
    expect(root).toMatch(/<a href="\/sandwiches\/banh-mi"[^>]*>/)
    expect(root).toMatch(/<a href="\/sandwiches\/reuben"[^>]*>/)
    expect(root).toContain('Reuben description.')
    expect(root).toContain('30 sandwiches')
  })

  it('describes the encyclopedia and names its canonical address', async () => {
    respondByAddress({ '/api/database?limit=24&offset=0': sandwichList })

    const head = headContent(await (await middleware(makeRequest('/sandwiches'))).text())

    expect(head).toContain('<title>Sandwich Encyclopedia | Between the Bread</title>')
    expect(head).toContain(
      '<meta name="description" content="Iconic sandwiches from around the world, and the stories behind them." data-rh="true" />',
    )
    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/sandwiches" data-rh="true" />')
  })

  it('hands the first page to the app', async () => {
    respondByAddress({ '/api/database?limit=24&offset=0': sandwichList })

    const html = await (await middleware(makeRequest('/sandwiches'))).text()

    expect(initialData(html)).toEqual({ path: '/sandwiches', data: { items: sandwichList.data, totalCount: 30 } })
  })

  it('serves searches and filters as usual', async () => {
    const res = await middleware(makeRequest('/sandwiches?q=pork'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('serves the page as usual when the list cannot be loaded', async () => {
    respondByAddress({})

    const res = await middleware(makeRequest('/sandwiches'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

const postSummary = (title: string, slug: string) => ({
  slug,
  title,
  excerpt: `${title} excerpt.`,
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  categories: [{ slug: 'dietary', name: 'Dietary' }],
})

const blogCategories = {
  data: [
    { slug: 'dietary', name: 'Dietary', description: 'Vegan, gluten-free and more.', post_count: 2 },
    { slug: 'techniques', name: 'Techniques', description: null, post_count: 0 },
  ],
}

const postList = { data: [postSummary('Vegan builds', 'vegan-builds'), postSummary('Melting', 'melting')], meta: { total_count: 2 } }

describe('Blog list in the first response', () => {
  const routes = { '/api/blog/categories': blogCategories, '/api/blog?limit=12&offset=0': postList }

  it('writes the heading, category links and a link to every post on the first page', async () => {
    respondByAddress(routes)

    const root = rootContent(await (await middleware(makeRequest('/blog'))).text())

    expect(root).toMatch(/<h1[^>]*>Blog<\/h1>/)
    expect(root).toMatch(/<a href="\/blog\/category\/dietary"[^>]*>Dietary<\/a>/)
    expect(root).not.toContain('/blog/category/techniques')
    expect(root).toMatch(/<a href="\/blog\/vegan-builds"[^>]*>Vegan builds<\/a>/)
    expect(root).toMatch(/<a href="\/blog\/melting"[^>]*>Melting<\/a>/)
  })

  it('describes the blog, names its canonical address and its feed', async () => {
    respondByAddress(routes)

    const head = headContent(await (await middleware(makeRequest('/blog'))).text())

    expect(head).toContain('<title>Blog | Between the Bread</title>')
    expect(head).toContain(
      '<meta name="description" content="Sandwich stories, guides and ideas from Between the Bread." data-rh="true" />',
    )
    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/blog" data-rh="true" />')
    expect(head).toContain('href="https://betweenbread.co/blog/rss.xml"')
  })

  it('hands the categories and posts to the app', async () => {
    respondByAddress(routes)

    const html = await (await middleware(makeRequest('/blog'))).text()

    expect(initialData(html)).toEqual({
      path: '/blog',
      data: { categories: blogCategories.data, posts: { items: postList.data, totalCount: 2 } },
    })
  })

  it('serves the page as usual when the posts cannot be loaded', async () => {
    respondByAddress({ '/api/blog/categories': blogCategories })

    const res = await middleware(makeRequest('/blog'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

describe('Blog category pages in the first response', () => {
  const routes = { '/api/blog/categories': blogCategories, '/api/blog?category=dietary&limit=12&offset=0': postList }

  it('writes the category name, description and its posts', async () => {
    respondByAddress(routes)

    const root = rootContent(await (await middleware(makeRequest('/blog/category/dietary'))).text())

    expect(root).toMatch(/<h1[^>]*>Dietary<\/h1>/)
    expect(root).toContain('Vegan, gluten-free and more.')
    expect(root).toMatch(/<a href="\/blog\/vegan-builds"[^>]*>Vegan builds<\/a>/)
    expect(root).toMatch(/<a href="\/blog"[^>]*>All<\/a>/)
  })

  it('describes the category and names its canonical address', async () => {
    respondByAddress(routes)

    const head = headContent(await (await middleware(makeRequest('/blog/category/dietary'))).text())

    expect(head).toContain('<meta name="description" content="Vegan, gluten-free and more." data-rh="true" />')
    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/blog/category/dietary" data-rh="true" />')
  })

  it('hands the categories and posts to the app', async () => {
    respondByAddress(routes)

    const html = await (await middleware(makeRequest('/blog/category/dietary'))).text()

    expect(initialData(html)).toEqual({
      path: '/blog/category/dietary',
      data: { categories: blogCategories.data, posts: { items: postList.data, totalCount: 2 } },
    })
  })
})

describe('Pages that do not exist', () => {
  it.each([
    ['an encyclopedia entry', '/sandwiches/made-up', {}],
    ['a blog post', '/blog/made-up', {}],
    ['a blog category', '/blog/category/made-up', { '/api/blog/categories': blogCategories, '/api/blog?category=made-up&limit=12&offset=0': postList }],
    ['a blog category with no live posts', '/blog/category/techniques', { '/api/blog/categories': blogCategories, '/api/blog?category=techniques&limit=12&offset=0': { data: [], meta: { total_count: 0 } } }],
  ])('tell search engines that %s is not found', async (_label, path, routes) => {
    respondByAddress(routes)

    const res = await middleware(makeRequest(path))

    expect(res.status).toBe(404)
    expect(res.headers.get('x-middleware-next')).toBeNull()
  })

  it('still sends the app so visitors see the not-found page', async () => {
    respondByAddress({})

    const res = await middleware(makeRequest('/sandwiches/made-up'))
    const html = await res.text()

    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>')
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
  })

  it('asks search engines not to index the not-found page', async () => {
    respondByAddress({})

    const html = await (await middleware(makeRequest('/blog/made-up'))).text()

    expect(headContent(html)).toContain('<meta name="robots" content="noindex" />')
  })

  it('serves the page as usual when the lookup fails for another reason', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }))

    const res = await middleware(makeRequest('/sandwiches/reuben'))

    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})

const communitySandwich = {
  id: 'c-1',
  slug: 'turkey-swiss-on-rye-abc12345',
  name: 'Turkey & Swiss on Rye',
  fun_name: null,
  composition: {
    protein: [{ slug: 'turkey', name: 'Turkey' }],
    bread: [{ slug: 'rye', name: 'Rye' }],
    cheese: [{ slug: 'swiss', name: 'Swiss' }],
  },
  dietary_tags: ['contains_pork'],
  generated_count: 47,
  avg_rating: 4.5,
  rating_count: 12,
  created_at: '2026-10-01T12:00:00.000Z',
  comment_count: 0,
  photo_count: 0,
  first_made_by: { username: 'deli_dan', is_admin: true },
}

describe('Community sandwiches in the first response', () => {
  const routes = (data: Record<string, unknown> = communitySandwich) => ({ '/api/community/turkey-swiss-on-rye-abc12345': { data } })

  it('writes the sandwich name as the only top-level heading', async () => {
    respondByAddress(routes())

    const html = await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text()

    expect(rootContent(html)).toMatch(/<h1[^>]*>Turkey &amp; Swiss on Rye<\/h1>/)
    expect(count(html, '<h1')).toBe(1)
  })

  it('leads with the fun name and keeps the descriptive name underneath', async () => {
    respondByAddress(routes({ ...communitySandwich, fun_name: 'The Rye Guy' }))

    const root = rootContent(await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text())

    expect(root).toMatch(/<h1[^>]*>The Rye Guy<\/h1>/)
    expect(root).toContain('Turkey &amp; Swiss on Rye')
  })

  it('writes the picture, rating, making history, ingredients and dietary tags', async () => {
    respondByAddress(routes())

    const root = rootContent(await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text())

    expect(count(root, 'aria-label="Rye"')).toBe(2)
    expect(root).toContain('Rated 4.5 out of 5 from 12 ratings')
    expect(root).toContain('Made 47 times')
    expect(root).toMatch(/First made by <a href="\/u\/deli_dan"[^>]*>@deli_dan<\/a>/)
    expect(root).toContain('>Admin<')
    expect(root).toContain('on Oct 1, 2026')
    expect(root).toMatch(/<h2[^>]*>Ingredients<\/h2>/)
    expect(root.indexOf('>Bread</dt>')).toBeLessThan(root.indexOf('>Protein</dt>'))
    expect(root).toContain('Contains Pork')
  })

  it('gives only the date when the first maker has no username', async () => {
    respondByAddress(routes({ ...communitySandwich, first_made_by: null }))

    const root = rootContent(await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text())

    expect(root).toContain('First made on Oct 1, 2026')
  })

  it('describes the sandwich and names its canonical address', async () => {
    respondByAddress(routes())

    const head = headContent(await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text())

    expect(head).toContain('<title>Turkey &amp; Swiss on Rye | Community | Between the Bread</title>')
    expect(head).toContain(
      '<meta name="description" content="Turkey &amp; Swiss on Rye: Rye, Turkey and Swiss. Made 47 times by the Between the Bread community." data-rh="true" />',
    )
    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/community/turkey-swiss-on-rye-abc12345" data-rh="true" />')
    expect(head).not.toContain('noindex')
  })

  it('asks search engines to skip sandwiches nobody has rated yet', async () => {
    respondByAddress(routes({ ...communitySandwich, avg_rating: null, rating_count: 0 }))

    const html = await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text()

    expect(headContent(html)).toContain('<meta name="robots" content="noindex" data-rh="true" />')
    expect(rootContent(html)).toContain('No ratings yet')
  })

  it('hands the sandwich to the app', async () => {
    respondByAddress(routes())

    const html = await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text()

    expect(initialData(html)).toEqual({ path: '/community/turkey-swiss-on-rye-abc12345', data: communitySandwich })
  })

  it('escapes special characters in the sandwich text', async () => {
    respondByAddress(routes({ ...communitySandwich, name: '<b>Bold</b>', composition: { bread: [{ slug: 'rye', name: '<i>Rye</i>' }] } }))

    const root = rootContent(await (await middleware(makeRequest('/community/turkey-swiss-on-rye-abc12345'))).text())

    expect(root).not.toContain('<b>')
    expect(root).not.toContain('<i>Rye')
  })

  it('answers not found for a sandwich that does not exist', async () => {
    respondByAddress({})

    const res = await middleware(makeRequest('/community/made-up-abc12345'))

    expect(res.status).toBe(404)
  })
})

describe('Community leaderboard in the first response', () => {
  const leaderboard = {
    data: [
      { ...communitySandwich, rank: 1, comment_count: undefined, photo_count: undefined, first_made_by: undefined },
      { ...communitySandwich, id: 'c-2', slug: 'ham-abc12345', name: 'Ham on Rye', rank: 2, generated_count: 1, avg_rating: null, rating_count: 0 },
    ].map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined))),
    meta: { total_count: 30 },
  }
  const routes = { '/api/community?limit=24&offset=0': leaderboard }

  it('writes the heading and a ranked card for each sandwich on the first page', async () => {
    respondByAddress(routes)

    const root = rootContent(await (await middleware(makeRequest('/community'))).text())

    expect(root).toMatch(/<h1[^>]*>Community Leaderboard<\/h1>/)
    expect(root).toMatch(/<a href="\/community\/turkey-swiss-on-rye-abc12345"[^>]*>/)
    expect(root).toMatch(/<a href="\/community\/ham-abc12345"[^>]*>/)
    expect(root).toContain('aria-label="1st place"')
    expect(root).toContain('Made 47 times')
    expect(root).toContain('Made once')
    expect(root).toContain('Not yet rated')
    expect(root).toContain('Load more')
  })

  it('shows Most Popular as the chosen sort', async () => {
    respondByAddress(routes)

    const root = rootContent(await (await middleware(makeRequest('/community'))).text())

    expect(root).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Most Popular<\/button>/)
  })

  it('describes the leaderboard and names its canonical address', async () => {
    respondByAddress(routes)

    const head = headContent(await (await middleware(makeRequest('/community'))).text())

    expect(head).toContain('<title>Community Leaderboard | Between the Bread</title>')
    expect(head).toContain('<link rel="canonical" href="https://betweenbread.co/community" data-rh="true" />')
  })

  it('hands the first page to the app', async () => {
    respondByAddress(routes)

    const html = await (await middleware(makeRequest('/community'))).text()

    expect(initialData(html)).toEqual({ path: '/community', data: { items: leaderboard.data, totalCount: 30 } })
  })

  it('serves sorted and filtered views as usual', async () => {
    const sorted = await middleware(makeRequest('/community?sort=newest'))
    const filtered = await middleware(makeRequest('/community?diet=vegan'))

    expect(sorted.headers.get('x-middleware-next')).toBe('1')
    expect(filtered.headers.get('x-middleware-next')).toBe('1')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('Images in the first response', () => {
  it('loads the blog cover straight away in a fixed frame', async () => {
    const root = rootContent(await pageFor('/blog/vegan-builds', post))

    expect(root).toMatch(/<img src="https:\/\/cdn\.example\.com\/cover\.jpg" alt="" class="[^"]*aspect-video[^"]*" \/>/)
  })

  it('loads pictures inside a post and on related cards only when scrolled to', async () => {
    const root = rootContent(
      await pageFor('/blog/vegan-builds', {
        ...post,
        body: 'Look:\n\n![Toasted rye](https://cdn.example.com/rye.png)',
        related_sandwiches: [{ name: 'Cubano', slug: 'cubano', image_url: 'https://cdn.example.com/cubano.jpg', description: null }],
      }),
    )

    expect(root).toMatch(/<img [^>]*src="https:\/\/cdn\.example\.com\/rye\.png"[^>]*>/)
    expect(root).toMatch(/<img loading="lazy" decoding="async" src="https:\/\/cdn\.example\.com\/rye\.png"/)
    expect(root).toMatch(/<img src="https:\/\/cdn\.example\.com\/cubano\.jpg" alt="" loading="lazy" decoding="async"/)
  })

  it('loads the encyclopedia photo straight away in a fixed frame', async () => {
    const root = rootContent(await pageFor('/sandwiches/reuben', entry))

    expect(root).toContain('<img src="https://cdn.example.com/reuben.jpg" alt="Reuben" class="h-72 w-full rounded-lg object-cover" />')
  })

  it('loads list card pictures only when scrolled to', async () => {
    respondByAddress({
      '/api/database?limit=24&offset=0': { data: [{ ...summary('Reuben', 'reuben'), image_url: 'https://cdn.example.com/reuben.jpg' }], meta: { total_count: 1 } },
    })

    const root = rootContent(await (await middleware(makeRequest('/sandwiches'))).text())

    expect(root).toMatch(/<img src="https:\/\/cdn\.example\.com\/reuben\.jpg" alt="Reuben" loading="lazy" decoding="async"/)
  })
})
