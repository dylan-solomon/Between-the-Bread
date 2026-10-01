import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeReq, makeRes, queueTableResults, callsOf, anyString } from '../../_lib/__tests__/supabaseMock.js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../rss.js'

const row = (overrides: Record<string, unknown> = {}) => ({
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds that skip the meat.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  blog_post_categories: [
    { blog_categories: { slug: 'dietary', name: 'Dietary', display_order: 4 } },
    { blog_categories: { slug: 'sandwich-ideas', name: 'Sandwich Ideas', display_order: 1 } },
  ],
  ...overrides,
})

const posts = (...rows: unknown[]) => ({ data: rows, error: null })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /blog/rss.xml', () => {
  it('describes the blog as an RSS channel', async () => {
    queueTableResults(mockFrom, [posts(row())])
    const res = makeRes()

    await handler(makeReq(), res)

    const xml = String(res._body)
    expect(res._status).toBe(200)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<title>Between the Bread Blog</title>')
    expect(xml).toContain('<link>https://betweenbread.co/blog</link>')
    expect(xml).toContain('<description>Sandwich stories, guides and ideas from Between the Bread.</description>')
    expect(xml).toContain('<atom:link href="https://betweenbread.co/blog/rss.xml" rel="self" type="application/rss+xml"/>')
    expect(xml.trimEnd().endsWith('</rss>')).toBe(true)
  })

  it('lists each post with its link, date, summary, categories and author', async () => {
    queueTableResults(mockFrom, [posts(row())])
    const res = makeRes()

    await handler(makeReq(), res)

    const xml = String(res._body)
    expect(xml).toContain('<title>Vegan builds</title>')
    expect(xml).toContain('<link>https://betweenbread.co/blog/vegan-builds</link>')
    expect(xml).toContain('<guid isPermaLink="true">https://betweenbread.co/blog/vegan-builds</guid>')
    expect(xml).toContain('<pubDate>Thu, 01 Oct 2026 12:00:00 GMT</pubDate>')
    expect(xml).toContain('<description>Five builds that skip the meat.</description>')
    expect(xml).toContain('<category>Sandwich Ideas</category>')
    expect(xml).toContain('<category>Dietary</category>')
    expect(xml).toContain('<dc:creator>Dylan</dc:creator>')
  })

  it('dates the channel by the newest post', async () => {
    queueTableResults(mockFrom, [posts(row(), row({ slug: 'older', published_at: '2026-08-01T12:00:00.000Z' }))])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(String(res._body)).toContain('<lastBuildDate>Thu, 01 Oct 2026 12:00:00 GMT</lastBuildDate>')
  })

  it('is still a valid feed when there are no posts', async () => {
    queueTableResults(mockFrom, [posts()])
    const res = makeRes()

    await handler(makeReq(), res)

    const xml = String(res._body)
    expect(res._status).toBe(200)
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('<lastBuildDate>')
  })

  it('asks for the 20 newest live posts', async () => {
    const calls = queueTableResults(mockFrom, [posts(row())])

    await handler(makeReq(), makeRes())

    expect(callsOf(calls, 'from')[0]?.args).toEqual(['blog_posts'])
    expect(callsOf(calls, 'select')[0]?.args[0]).not.toContain('body')
    expect(callsOf(calls, 'eq')[0]?.args).toEqual(['published', true])
    expect(callsOf(calls, 'lte')[0]?.args).toEqual(['published_at', anyString])
    expect(callsOf(calls, 'order')[0]?.args).toEqual(['published_at', { ascending: false }])
    expect(callsOf(calls, 'limit')[0]?.args).toEqual([20])
  })

  it('escapes characters that are special in XML', async () => {
    queueTableResults(mockFrom, [posts(row({ title: 'Salt & <pepper>', excerpt: '"quoted" & more' }))])
    const res = makeRes()

    await handler(makeReq(), res)

    const xml = String(res._body)
    expect(xml).toContain('<title>Salt &amp; &lt;pepper&gt;</title>')
    expect(xml).toContain('<description>&quot;quoted&quot; &amp; more</description>')
  })

  it('sends the right content type and lets the CDN cache it briefly', async () => {
    queueTableResults(mockFrom, [posts(row())])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._headers['Content-Type']).toBe('application/rss+xml; charset=utf-8')
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('returns 500 and no cache header when the query fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('returns 405 for POST', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST' }), res)

    expect(res._status).toBe(405)
  })
})

describe('feed routing', () => {
  const rewrites = (JSON.parse(readFileSync('vercel.json', 'utf-8')) as { rewrites: { source: string; destination: string }[] }).rewrites

  it('serves /blog/rss.xml from the API before the single-page-app fallback', () => {
    const feed = rewrites.findIndex((rewrite) => rewrite.source === '/blog/rss.xml')
    const fallback = rewrites.findIndex((rewrite) => rewrite.destination === '/index.html')

    expect(rewrites[feed]?.destination).toBe('/api/blog/rss')
    expect(feed).toBeGreaterThanOrEqual(0)
    expect(feed).toBeLessThan(fallback)
  })
})
