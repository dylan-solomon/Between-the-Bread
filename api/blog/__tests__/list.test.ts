import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReq, makeRes, queueTableResults, callsOf, errorOf, dataOf, metaOf, anyString } from '../../_lib/__tests__/supabaseMock.js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../../blog.js'

const row = {
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  blog_post_categories: [
    { blog_categories: { slug: 'dietary', name: 'Dietary', display_order: 4 } },
    { blog_categories: { slug: 'sandwich-ideas', name: 'Sandwich Ideas', display_order: 1 } },
  ],
}

const listedPost = {
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  categories: [
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
    { slug: 'dietary', name: 'Dietary' },
  ],
}

const posts = { data: [row], count: 1, error: null }

const get = (query: Record<string, string> = {}) => makeReq({ query })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/blog', () => {
  it('returns live posts newest first, with categories and no body', async () => {
    const calls = queueTableResults(mockFrom, [posts])
    const res = makeRes()

    await handler(get(), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual([listedPost])
    expect(metaOf(res)).toMatchObject({ total_count: 1, limit: 12, offset: 0 })
    expect(callsOf(calls, 'from')[0]?.args).toEqual(['blog_posts'])
    expect(callsOf(calls, 'select')[0]?.args[0]).not.toContain('body')
    expect(callsOf(calls, 'eq')[0]?.args).toEqual(['published', true])
    expect(callsOf(calls, 'lte')[0]?.args).toEqual(['published_at', anyString])
    expect(callsOf(calls, 'order')[0]?.args).toEqual(['published_at', { ascending: false }])
    expect(callsOf(calls, 'range')[0]?.args).toEqual([0, 11])
  })

  it('lets the CDN cache a successful response briefly', async () => {
    queueTableResults(mockFrom, [posts])
    const res = makeRes()

    await handler(get(), res)

    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('pages with limit and offset', async () => {
    const calls = queueTableResults(mockFrom, [posts])

    await handler(get({ limit: '5', offset: '10' }), makeRes())

    expect(callsOf(calls, 'range')[0]?.args).toEqual([10, 14])
  })

  it.each([
    ['a limit of 0', { limit: '0' }],
    ['a limit over 50', { limit: '51' }],
    ['a limit that is not a number', { limit: 'abc' }],
    ['an offset that is not a number', { offset: '-1' }],
    ['a category that is not a slug', { category: 'Not A Slug' }],
  ])('rejects %s', async (_label, query) => {
    const calls = queueTableResults(mockFrom, [])
    const res = makeRes()

    await handler(get(query), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('INVALID_INPUT')
    expect(callsOf(calls, 'from')).toHaveLength(0)
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('searches the full-text index when q is given', async () => {
    const calls = queueTableResults(mockFrom, [posts])

    await handler(get({ q: ' grilled cheese ' }), makeRes())

    expect(callsOf(calls, 'textSearch')[0]?.args).toEqual([
      'search_vector',
      'grilled cheese',
      { type: 'websearch', config: 'english' },
    ])
  })

  it('ignores a blank q', async () => {
    const calls = queueTableResults(mockFrom, [posts])

    await handler(get({ q: '   ' }), makeRes())

    expect(callsOf(calls, 'textSearch')).toHaveLength(0)
  })

  it('filters to the posts in a category', async () => {
    const calls = queueTableResults(mockFrom, [
      { data: { id: 'c4' }, error: null },
      { data: [{ post_id: 'p1' }, { post_id: 'p2' }], error: null },
      posts,
    ])

    await handler(get({ category: 'dietary' }), makeRes())

    expect(callsOf(calls, 'from').map((call) => call.args[0])).toEqual(['blog_categories', 'blog_post_categories', 'blog_posts'])
    expect(callsOf(calls, 'in')[0]?.args).toEqual(['id', ['p1', 'p2']])
  })

  it('returns an empty list for a category with no live posts', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { id: 'c4' }, error: null }, { data: [], error: null }])
    const res = makeRes()

    await handler(get({ category: 'dietary' }), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual([])
    expect(metaOf(res)).toMatchObject({ total_count: 0 })
    expect(callsOf(calls, 'from')).toHaveLength(2)
  })

  it('rejects a category that does not exist', async () => {
    queueTableResults(mockFrom, [{ data: null, error: null }])
    const res = makeRes()

    await handler(get({ category: 'made-up' }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).message).toBe('category is not a recognised category.')
  })

  it('returns 500 when the category lookup fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(get({ category: 'dietary' }), res)

    expect(res._status).toBe(500)
  })

  it('returns 500 when the posts query fails', async () => {
    queueTableResults(mockFrom, [{ data: null, count: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(get(), res)

    expect(res._status).toBe(500)
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('returns 405 for POST', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST' }), res)

    expect(res._status).toBe(405)
  })
})
