import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReq, makeRes, queueTableResults, callsOf, errorOf, dataOf, anyString } from '../../_lib/__tests__/supabaseMock.js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../[slug].js'

const postRow = {
  id: 'p1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds.',
  body: '## Build one',
  cover_image_url: 'https://example.com/cover.jpg',
  related_sandwich_slugs: ['reuben', 'unpublished-one', 'cubano'],
  author_name: 'Dylan',
  meta_description: null,
  reading_time_minutes: 3,
  published_at: '2026-10-01T12:00:00.000Z',
  updated_at: '2026-10-02T12:00:00.000Z',
  blog_post_categories: [
    { blog_categories: { id: 'c4', slug: 'dietary', name: 'Dietary', display_order: 4 } },
    { blog_categories: { id: 'c1', slug: 'sandwich-ideas', name: 'Sandwich Ideas', display_order: 1 } },
  ],
}

const sandwiches = {
  data: [
    { name: 'Cubano', slug: 'cubano', image_url: null, description: 'Pork and pickles.' },
    { name: 'Reuben', slug: 'reuben', image_url: null, description: 'Corned beef.' },
  ],
  error: null,
}

const otherPost = (slug: string) => ({
  slug,
  title: slug,
  excerpt: '',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-09-01T12:00:00.000Z',
  reading_time_minutes: 1,
  blog_post_categories: [],
})

const found = { data: postRow, error: null }
const noRelated = { data: { ...postRow, related_sandwich_slugs: [] }, error: null }

const get = (slug = 'vegan-builds') => makeReq({ query: { slug } })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/blog/:slug', () => {
  it('returns the post with body, categories, related sandwiches and more posts', async () => {
    const calls = queueTableResults(mockFrom, [
      found,
      sandwiches,
      { data: [{ post_id: 'p2' }, { post_id: 'p2' }, { post_id: 'p3' }], error: null },
      { data: [otherPost('shared-a'), otherPost('shared-b')], error: null },
      { data: [otherPost('shared-a'), otherPost('recent-c'), otherPost('recent-d')], error: null },
    ])
    const res = makeRes()

    await handler(get(), res)

    expect(res._status).toBe(200)
    const data = dataOf(res) as Record<string, unknown>
    expect(data).toMatchObject({
      slug: 'vegan-builds',
      body: '## Build one',
      reading_time_minutes: 3,
      categories: [
        { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
        { slug: 'dietary', name: 'Dietary' },
      ],
    })
    expect(data).not.toHaveProperty('related_sandwich_slugs')
    expect(data).not.toHaveProperty('blog_post_categories')
    expect(data.related_sandwiches).toEqual([
      { name: 'Reuben', slug: 'reuben', image_url: null, description: 'Corned beef.' },
      { name: 'Cubano', slug: 'cubano', image_url: null, description: 'Pork and pickles.' },
    ])
    expect((data.more_posts as { slug: string }[]).map((post) => post.slug)).toEqual(['shared-a', 'shared-b', 'recent-c'])
    expect(callsOf(calls, 'from').map((call) => call.args[0])).toEqual([
      'blog_posts', 'sandwich_database', 'blog_post_categories', 'blog_posts', 'blog_posts',
    ])
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('looks the post up by slug and only while it is live', async () => {
    const calls = queueTableResults(mockFrom, [noRelated, { data: [], error: null }, { data: [], error: null }])

    await handler(get(), makeRes())

    const firstEq = callsOf(calls, 'eq').slice(0, 2).map((call) => call.args)
    expect(firstEq).toEqual([['slug', 'vegan-builds'], ['published', true]])
    expect(callsOf(calls, 'lte')[0]?.args).toEqual(['published_at', anyString])
  })

  it('shows only published sandwiches and skips the lookup when none are linked', async () => {
    const calls = queueTableResults(mockFrom, [noRelated, { data: [], error: null }, { data: [], error: null }])
    const res = makeRes()

    await handler(get(), res)

    expect((dataOf(res) as { related_sandwiches: unknown[] }).related_sandwiches).toEqual([])
    expect(callsOf(calls, 'from').map((call) => call.args[0])).not.toContain('sandwich_database')
  })

  it('does not look for shared-category posts when the post has no categories', async () => {
    const calls = queueTableResults(mockFrom, [
      { data: { ...postRow, related_sandwich_slugs: [], blog_post_categories: [] }, error: null },
      { data: [otherPost('recent-a')], error: null },
    ])
    const res = makeRes()

    await handler(get(), res)

    expect((dataOf(res) as { more_posts: { slug: string }[] }).more_posts.map((post) => post.slug)).toEqual(['recent-a'])
    expect(callsOf(calls, 'from').map((call) => call.args[0])).toEqual(['blog_posts', 'blog_posts'])
  })

  it('never lists the post itself among more posts', async () => {
    const calls = queueTableResults(mockFrom, [noRelated, { data: [], error: null }, { data: [], error: null }])

    await handler(get(), makeRes())

    expect(callsOf(calls, 'neq').map((call) => call.args)).toContainEqual(['id', 'p1'])
  })

  it.each([
    ['an unknown slug', get(), { data: null, error: null }],
    ['a slug that is not a slug', get('Not A Slug'), { data: null, error: null }],
  ])('returns 404 for %s', async (_label, req, result) => {
    queueTableResults(mockFrom, [result])
    const res = makeRes()

    await handler(req, res)

    expect(res._status).toBe(404)
    expect(errorOf(res).code).toBe('POST_NOT_FOUND')
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('returns 500 when the lookup fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(get(), res)

    expect(res._status).toBe(500)
  })

  it('returns 500 when a follow-up query fails', async () => {
    queueTableResults(mockFrom, [found, { data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(get(), res)

    expect(res._status).toBe(500)
    expect(res._headers['Cache-Control']).toBeUndefined()
  })

  it('returns 405 for POST', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST', query: { slug: 'vegan-builds' } }), res)

    expect(res._status).toBe(405)
  })
})
