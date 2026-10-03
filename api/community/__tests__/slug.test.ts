import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({ supabase: { from: mockFrom, rpc: mockRpc } }))

import handler from '../[slug].js'
import { callsOf, dataOf, errorOf, makeReq, makeRes, queueTableResults } from '../../_lib/__tests__/supabaseMock.js'

const entry = {
  id: 'community-1',
  slug: 'turkey-swiss-on-rye-abc12345',
  name: 'Turkey & Swiss on Rye',
  fun_name: null,
  composition: { bread: [{ slug: 'rye', name: 'Rye' }] },
  dietary_tags: ['contains_pork'],
  generated_count: 5,
  avg_rating: 4.5,
  rating_count: 2,
  first_generated_by: 'user-1',
  created_at: '2026-09-01T12:00:00Z',
}

const arrange = ({ row = entry as unknown, comments = 3, photos = 1 } = {}) =>
  queueTableResults(mockFrom, [
    { data: row, error: null },
    { data: null, error: null, count: comments },
    { data: null, error: null, count: photos },
  ])

const lookup = async (slug: unknown, method = 'GET') => {
  const res = makeRes()
  await handler(makeReq({ method, query: { slug } as Record<string, string> }), res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRpc.mockResolvedValue({ data: [{ id: 'user-1', username: 'deli_dan', is_admin: false }], error: null })
})

describe('GET /api/community/:slug', () => {
  it('returns the sandwich with its comment and photo counts and first maker', async () => {
    const calls = arrange()

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(res._status).toBe(200)
    const publicFields = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'first_generated_by'))
    expect(dataOf(res)).toEqual({
      ...publicFields,
      comment_count: 3,
      photo_count: 1,
      first_made_by: { username: 'deli_dan', is_admin: false },
    })
    expect(callsOf(calls, 'eq')[0].args).toEqual(['slug', 'turkey-swiss-on-rye-abc12345'])
    expect(mockRpc).toHaveBeenCalledWith('public_usernames', { p_ids: ['user-1'] })
  })

  it('never shows the account id of the first maker', async () => {
    arrange()

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(dataOf(res)).not.toHaveProperty('first_generated_by')
  })

  it('leaves the first maker out when they have no username', async () => {
    arrange()
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect((dataOf(res) as { first_made_by: unknown }).first_made_by).toBeNull()
  })

  it('does not look anyone up when nobody signed in made it first', async () => {
    arrange({ row: { ...entry, first_generated_by: null } })

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect((dataOf(res) as { first_made_by: unknown }).first_made_by).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('still shows the sandwich when the first maker cannot be looked up', async () => {
    arrange()
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(res._status).toBe(200)
    expect((dataOf(res) as { first_made_by: unknown }).first_made_by).toBeNull()
  })

  it('lets the sandwich be cached briefly', async () => {
    arrange()

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('says when there is no such sandwich', async () => {
    arrange({ row: null })

    const res = await lookup('made-up-abc12345')

    expect(res._status).toBe(404)
    expect(errorOf(res).code).toBe('COMMUNITY_SANDWICH_NOT_FOUND')
  })

  it('does not look up addresses that cannot be slugs', async () => {
    const res = await lookup('Not A Slug')

    expect(res._status).toBe(404)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fails clearly when the sandwich cannot be loaded', async () => {
    queueTableResults(mockFrom, [{ data: null, error: { message: 'boom' } }])

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(res._status).toBe(500)
  })

  it('fails clearly when the counts cannot be loaded', async () => {
    queueTableResults(mockFrom, [
      { data: entry, error: null },
      { data: null, error: { message: 'boom' } },
      { data: null, error: null, count: 0 },
    ])

    const res = await lookup('turkey-swiss-on-rye-abc12345')

    expect(res._status).toBe(500)
  })

  it('only answers GET requests', async () => {
    const res = await lookup('turkey-swiss-on-rye-abc12345', 'POST')

    expect(res._status).toBe(405)
  })
})
