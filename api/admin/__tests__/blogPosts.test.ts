import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  makeReq, makeRes, profileBranch, queueTableResults, callsOf, errorOf, dataOf, anyString,
} from '../../_lib/__tests__/supabaseMock.js'

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

import handler from '../blog.js'

const validUser = { id: 'admin-1', email: 'admin@example.com' }

const postRow = {
  id: 'p1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  published: false,
  blog_post_categories: [
    { blog_categories: { slug: 'dietary', name: 'Dietary', display_order: 4 } },
    { blog_categories: { slug: 'sandwich-ideas', name: 'Sandwich Ideas', display_order: 1 } },
  ],
}

const publicPost = {
  id: 'p1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  published: false,
  categories: [
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
    { slug: 'dietary', name: 'Dietary' },
  ],
}

const categoryRows = { data: [{ id: 'c4', slug: 'dietary' }], error: null }
const noError = { data: null, error: null }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
  mockRpc.mockResolvedValue({ data: null, error: null })
})

describe('GET /api/admin/blog', () => {
  it('returns every post with its categories in display order, most recently edited first', async () => {
    const calls = queueTableResults(mockFrom, [{ data: [postRow], error: null }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual([publicPost])
    expect(callsOf(calls, 'from')[0]?.args).toEqual(['blog_posts'])
    expect(callsOf(calls, 'order')[0]?.args).toEqual(['updated_at', { ascending: false }])
  })

  it('returns 500 when the query fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(500)
  })

  it('returns 403 for a signed-in user who is not an admin', async () => {
    mockFrom.mockImplementation(() => profileBranch(false))
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(403)
  })
})

describe('POST /api/admin/blog', () => {
  const create = (body: unknown) => makeReq({ method: 'POST', body })

  it('creates a post with its categories and returns it', async () => {
    const calls = queueTableResults(mockFrom, [categoryRows, { data: { id: 'p1' }, error: null }, { data: postRow, error: null }])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds', category_slugs: ['dietary'] }), res)

    expect(res._status).toBe(201)
    expect(dataOf(res)).toEqual(publicPost)
    expect(callsOf(calls, 'insert')[0]?.args[0]).toEqual({
      title: 'Vegan builds',
      slug: 'vegan-builds',
      author_id: 'admin-1',
      author_name: 'Between the Bread',
    })
    expect(mockRpc).toHaveBeenCalledWith('replace_blog_post_categories', { p_post_id: 'p1', p_category_ids: ['c4'] })
  })

  it('uses the byline that was given', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { id: 'p1' }, error: null }, { data: postRow, error: null }])

    await handler(create({ title: 'Vegan builds', author_name: 'Dylan' }), makeRes())

    expect(callsOf(calls, 'insert')[0]?.args[0]).toMatchObject({ author_name: 'Dylan' })
  })

  it('saves a draft with no categories without touching categories', async () => {
    const calls = queueTableResults(mockFrom, [{ data: { id: 'p1' }, error: null }, { data: postRow, error: null }])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds' }), res)

    expect(res._status).toBe(201)
    expect(callsOf(calls, 'from').map((call) => call.args[0])).toEqual(['blog_posts', 'blog_posts'])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('refuses to publish a post that has no category', async () => {
    const calls = queueTableResults(mockFrom, [])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds', published: true }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('CATEGORY_REQUIRED')
    expect(callsOf(calls, 'insert')).toHaveLength(0)
  })

  it('stamps the publish time when a post is published without one', async () => {
    const calls = queueTableResults(mockFrom, [categoryRows, { data: { id: 'p1' }, error: null }, { data: postRow, error: null }])

    await handler(create({ title: 'Vegan builds', published: true, category_slugs: ['dietary'] }), makeRes())

    expect(callsOf(calls, 'insert')[0]?.args[0]).toMatchObject({ published: true, published_at: anyString })
  })

  it('keeps a publish time that was given so a post can be scheduled', async () => {
    const calls = queueTableResults(mockFrom, [categoryRows, { data: { id: 'p1' }, error: null }, { data: postRow, error: null }])

    await handler(
      create({ title: 'Vegan builds', published: true, published_at: '2030-01-01T09:00:00.000Z', category_slugs: ['dietary'] }),
      makeRes(),
    )

    expect(callsOf(calls, 'insert')[0]?.args[0]).toMatchObject({ published_at: '2030-01-01T09:00:00.000Z' })
  })

  it('rejects an unknown category and writes nothing', async () => {
    const calls = queueTableResults(mockFrom, [{ data: [], error: null }])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds', category_slugs: ['made-up'] }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).message).toBe('Unknown category: made-up')
    expect(callsOf(calls, 'insert')).toHaveLength(0)
  })

  it('returns 400 with the reason for invalid input', async () => {
    const calls = queueTableResults(mockFrom, [])
    const res = makeRes()

    await handler(create({ title: 'Hi', slug: 'categories' }), res)

    expect(res._status).toBe(400)
    expect(errorOf(res).message).toBe('That slug is reserved.')
    expect(callsOf(calls, 'insert')).toHaveLength(0)
  })

  it('returns 409 when the slug already exists', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { code: '23505', message: 'duplicate' } }])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds' }), res)

    expect(res._status).toBe(409)
    expect(errorOf(res).code).toBe('SLUG_TAKEN')
  })

  it('returns 500 when the insert fails', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'db down' } }])
    const res = makeRes()

    await handler(create({ title: 'Vegan builds' }), res)

    expect(res._status).toBe(500)
  })

  it('removes the new post again when its categories cannot be saved', async () => {
    const calls = queueTableResults(mockFrom, [categoryRows, { data: { id: 'p1' }, error: null }, noError])
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    const res = makeRes()

    await handler(create({ title: 'Vegan builds', category_slugs: ['dietary'] }), res)

    expect(res._status).toBe(500)
    expect(callsOf(calls, 'delete')).toHaveLength(1)
    expect(callsOf(calls, 'eq').slice(-1)[0]?.args).toEqual(['id', 'p1'])
  })
})

describe('other methods', () => {
  it('returns 405 for PUT', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'PUT' }), res)

    expect(res._status).toBe(405)
  })
})
