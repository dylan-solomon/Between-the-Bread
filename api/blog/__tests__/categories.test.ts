import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReq, makeRes, queueTableResults, callsOf, dataOf } from '../../_lib/__tests__/supabaseMock.js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../categories.js'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /api/blog/categories', () => {
  it('returns every category in display order with its count of live posts', async () => {
    const calls = queueTableResults(mockFrom, [{
      data: [
        { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, display_order: 1, blog_post_categories: [{ count: 2 }] },
        { slug: 'dietary', name: 'Dietary', description: 'Vegan and more', display_order: 4, blog_post_categories: [{ count: 0 }] },
      ],
      error: null,
    }])
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual([
      { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, post_count: 2 },
      { slug: 'dietary', name: 'Dietary', description: 'Vegan and more', post_count: 0 },
    ])
    expect(callsOf(calls, 'from')[0]?.args).toEqual(['blog_categories'])
    expect(callsOf(calls, 'order')[0]?.args[0]).toBe('display_order')
    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('returns 500 when the query fails', async () => {
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
