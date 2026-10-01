import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { makeReq, makeRes, queueTableResults, callsOf } from '../_lib/__tests__/supabaseMock.js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../sitemap.js'

const entries = {
  data: [
    { slug: 'cubano', updated_at: '2026-09-20T10:00:00.000Z' },
    { slug: 'reuben', updated_at: '2026-10-01T08:30:00.000Z' },
  ],
  error: null,
}

const locations = (xml: unknown): string[] =>
  [...String(xml).matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /sitemap.xml', () => {
  it('lists the static pages, the encyclopedia index and every published entry', async () => {
    queueTableResults(mockFrom, [entries])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect(locations(res._body)).toEqual([
      'https://betweenbread.co/',
      'https://betweenbread.co/sandwiches',
      'https://betweenbread.co/about',
      'https://betweenbread.co/privacy',
      'https://betweenbread.co/terms',
      'https://betweenbread.co/sandwiches/cubano',
      'https://betweenbread.co/sandwiches/reuben',
    ])
  })

  it('dates each entry by when it last changed', async () => {
    queueTableResults(mockFrom, [entries])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(String(res._body)).toContain(
      '<loc>https://betweenbread.co/sandwiches/reuben</loc>\n    <lastmod>2026-10-01</lastmod>',
    )
  })

  it('is valid sitemap XML', async () => {
    queueTableResults(mockFrom, [entries])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(String(res._body).startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true)
    expect(String(res._body).trimEnd().endsWith('</urlset>')).toBe(true)
    expect(res._headers['Content-Type']).toBe('application/xml; charset=utf-8')
  })

  it('asks only for published entries, in a stable order', async () => {
    const calls = queueTableResults(mockFrom, [entries])

    await handler(makeReq(), makeRes())

    expect(callsOf(calls, 'from')[0]?.args).toEqual(['sandwich_database'])
    expect(callsOf(calls, 'select')[0]?.args).toEqual(['slug, updated_at'])
    expect(callsOf(calls, 'eq')[0]?.args).toEqual(['published', true])
    expect(callsOf(calls, 'order')[0]?.args).toEqual(['slug'])
  })

  it('still lists the static pages when no entries are published', async () => {
    queueTableResults(mockFrom, [{ data: [], error: null }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(locations(res._body)).toHaveLength(5)
  })

  it('escapes characters that are special in XML', async () => {
    queueTableResults(mockFrom, [{ data: [{ slug: 'a&b<c>', updated_at: '2026-10-01T08:30:00.000Z' }], error: null }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(String(res._body)).toContain('/sandwiches/a&amp;b&lt;c&gt;</loc>')
  })

  it('lets the CDN cache the sitemap briefly', async () => {
    queueTableResults(mockFrom, [entries])
    const res = makeRes()

    await handler(makeReq(), res)

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

describe('sitemap routing', () => {
  const rewrites = (JSON.parse(readFileSync('vercel.json', 'utf-8')) as { rewrites: { source: string; destination: string }[] }).rewrites

  it('serves /sitemap.xml from the API before the single-page-app fallback', () => {
    const sitemap = rewrites.findIndex((rewrite) => rewrite.source === '/sitemap.xml')
    const fallback = rewrites.findIndex((rewrite) => rewrite.destination === '/index.html')

    expect(rewrites[sitemap]?.destination).toBe('/api/sitemap')
    expect(sitemap).toBeGreaterThanOrEqual(0)
    expect(sitemap).toBeLessThan(fallback)
  })

  it('no longer ships a static sitemap file that would take precedence', () => {
    expect(existsSync('public/sitemap.xml')).toBe(false)
  })

  it('still points search engines at the sitemap from robots.txt', () => {
    expect(readFileSync('public/robots.txt', 'utf-8')).toContain('Sitemap: https://betweenbread.co/sitemap.xml')
  })
})
