import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  makeReq, makeRes, profileBranch, queueTableResults, callsOf, errorOf, dataOf, anyString,
} from '../../../_lib/__tests__/supabaseMock.js'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

import handler from '../[slug].js'

const validUser = { id: 'admin-1', email: 'admin@example.com' }

const existing = (overrides: Record<string, unknown> = {}) => ({
  data: { id: 'p1', published: false, published_at: null, blog_post_categories: [{ count: 1 }], ...overrides },
  error: null,
})

const postRow = {
  id: 'p1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  published: true,
  blog_post_categories: [{ blog_categories: { slug: 'dietary', name: 'Dietary', display_order: 4 } }],
}

const publicPost = {
  id: 'p1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  published: true,
  categories: [{ slug: 'dietary', name: 'Dietary' }],
}

const categoryRows = { data: [{ id: 'c4', slug: 'dietary' }], error: null }
const fetched = { data: postRow, error: null }
const noError = { data: null, error: null }

const patch = (body: unknown) => makeReq({ method: 'PATCH', body, query: { slug: 'vegan-builds' } })
const remove = (query: Record<string, string> = {}) =>
  makeReq({ method: 'DELETE', query: { slug: 'vegan-builds', ...query } })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
  mockRpc.mockResolvedValue({ data: null, error: null })
})

describe('PATCH /api/admin/blog/:slug', () => {
  it('updates the fields and returns the post with its categories', async () => {
    const calls = queueTableResults(mockFrom, [existing(), noError, fetched])
    const res = makeRes()

    await handler(patch({ excerpt: 'New excerpt.' }), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual(publicPost)
    expect(callsOf(calls, 'update')[0]?.args[0]).toEqual({ excerpt: 'New excerpt.', updated_at: anyString })
    expect(callsOf(calls, 'eq').map((call) => call.args)).toContainEqual(['id', 'p1'])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 404 when the post does not exist', async () => {
    const calls = queueTableResults(mockFrom, [{ data: null, error: null }])
    const res = makeRes()

    await handler(patch({ excerpt: 'x' }), res)

    expect(res._status).toBe(404)
    expect(errorOf(res).code).toBe('POST_NOT_FOUND')
    expect(callsOf(calls, 'update')).toHaveLength(0)
  })

  it('replaces the categories when new ones are given', async () => {
    queueTableResults(mockFrom, [existing(), categoryRows, noError, fetched])

    await handler(patch({ category_slugs: ['dietary'] }), makeRes())

    expect(mockRpc).toHaveBeenCalledWith('replace_blog_post_categories', { p_post_id: 'p1', p_category_ids: ['c4'] })
  })

  it('rejects an unknown category and changes nothing', async () => {
    const calls = queueTableResults(mockFrom, [existing(), { data: [], error: null }])
    const res = makeRes()

    await handler(patch({ category_slugs: ['made-up'] }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).message).toBe('Unknown category: made-up')
    expect(callsOf(calls, 'update')).toHaveLength(0)
  })

  it('stamps the publish time when an unpublished post with a category is published', async () => {
    const calls = queueTableResults(mockFrom, [existing(), noError, fetched])

    await handler(patch({ published: true }), makeRes())

    expect(callsOf(calls, 'update')[0]?.args[0]).toMatchObject({ published: true, published_at: anyString })
  })

  it('keeps the publish time a post already has', async () => {
    const calls = queueTableResults(mockFrom, [existing({ published_at: '2026-01-01T00:00:00.000Z' }), noError, fetched])

    await handler(patch({ published: true }), makeRes())

    expect(callsOf(calls, 'update')[0]?.args[0]).not.toHaveProperty('published_at')
  })

  it('refuses to publish a post that has no category', async () => {
    const calls = queueTableResults(mockFrom, [existing({ blog_post_categories: [{ count: 0 }] })])
    const res = makeRes()

    await handler(patch({ published: true }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('CATEGORY_REQUIRED')
    expect(callsOf(calls, 'update')).toHaveLength(0)
  })

  it('refuses to remove every category from a published post', async () => {
    const calls = queueTableResults(mockFrom, [existing({ published: true })])
    const res = makeRes()

    await handler(patch({ category_slugs: [] }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('CATEGORY_REQUIRED')
    expect(callsOf(calls, 'update')).toHaveLength(0)
  })

  it('allows unpublishing and removing the categories in the same save', async () => {
    queueTableResults(mockFrom, [existing({ published: true }), noError, fetched])
    const res = makeRes()

    await handler(patch({ published: false, category_slugs: [] }), res)

    expect(res._status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('replace_blog_post_categories', { p_post_id: 'p1', p_category_ids: [] })
  })

  it('returns 400 with the reason for invalid input', async () => {
    queueTableResults(mockFrom, [])
    const res = makeRes()

    await handler(patch({ slug: 'category' }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).message).toBe('That slug is reserved.')
  })

  it('returns 409 when the new slug is taken', async () => {
    queueTableResults(mockFrom, [existing(), { data: null, error: { code: '23505', message: 'duplicate' } }])
    const res = makeRes()

    await handler(patch({ slug: 'taken' }), res)

    expect(res._status).toBe(409)
    expect(errorOf(res).code).toBe('SLUG_TAKEN')
  })

  it('returns 500 when the update fails', async () => {
    queueTableResults(mockFrom, [existing(), { data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(patch({ excerpt: 'x' }), res)

    expect(res._status).toBe(500)
  })

  it('returns 500 when the categories cannot be saved', async () => {
    queueTableResults(mockFrom, [existing(), categoryRows, noError])
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    const res = makeRes()

    await handler(patch({ category_slugs: ['dietary'] }), res)

    expect(res._status).toBe(500)
  })
})

describe('DELETE /api/admin/blog/:slug', () => {
  it('unpublishes the post when permanent is not requested', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { ...postRow, published: false }, error: null }])
    const res = makeRes()

    await handler(remove(), res)

    expect(res._status).toBe(200)
    expect(callsOf(calls, 'update')[0]?.args[0]).toEqual({ published: false, updated_at: anyString })
    expect(callsOf(calls, 'delete')).toHaveLength(0)
  })

  it('returns 404 when unpublishing a post that does not exist', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { code: 'PGRST116', message: 'no rows' } }])
    const res = makeRes()

    await handler(remove(), res)

    expect(res._status).toBe(404)
  })

  it('deletes an unpublished post permanently', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { id: 'p1', published: false }, error: null }, noError])
    const res = makeRes()

    await handler(remove({ permanent: 'true' }), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual({ slug: 'vegan-builds', deleted: true })
    expect(callsOf(calls, 'delete')).toHaveLength(1)
  })

  it('refuses to delete a published post permanently', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { id: 'p1', published: true }, error: null }])
    const res = makeRes()

    await handler(remove({ permanent: 'true' }), res)

    expect(res._status).toBe(409)
    expect(errorOf(res).code).toBe('POST_PUBLISHED')
    expect(callsOf(calls, 'delete')).toHaveLength(0)
  })

  it('returns 404 when the post to delete does not exist', async () => {
    queueTableResults(mockFrom, [{ data: null, error: null }])
    const res = makeRes()

    await handler(remove({ permanent: 'true' }), res)

    expect(res._status).toBe(404)
  })

  it('returns 500 when the lookup fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(remove({ permanent: 'true' }), res)

    expect(res._status).toBe(500)
  })

  it('returns 500 when the delete fails', async () => {
    queueTableResults(mockFrom, [{ data: { id: 'p1', published: false }, error: null }, { data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(remove({ permanent: 'true' }), res)

    expect(res._status).toBe(500)
  })

  it('returns 403 for a signed-in user who is not an admin', async () => {
    mockFrom.mockImplementation(() => profileBranch(false))
    const res = makeRes()

    await handler(remove(), res)

    expect(res._status).toBe(403)
  })
})

describe('other methods', () => {
  it('returns 405 for POST', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST', query: { slug: 'vegan-builds' } }), res)

    expect(res._status).toBe(405)
  })
})
