import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({ supabase: { rpc: mockRpc } }))

import handler from '../[username].js'
import { dataOf, errorOf, makeReq, makeRes } from '../../_lib/__tests__/supabaseMock.js'

const row = { username: 'deli_dan', is_admin: false, joined_at: '2026-09-01T12:00:00Z', comment_count: 7 }

const lookup = async (username: unknown, method = 'GET') => {
  const res = makeRes()
  await handler(makeReq({ method, query: { username } as Record<string, string> }), res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRpc.mockResolvedValue({ data: [row], error: null })
})

describe('GET /api/profiles/:username', () => {
  it('returns the public profile', async () => {
    const res = await lookup('Deli_Dan')

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual(row)
    expect(mockRpc).toHaveBeenCalledWith('public_profile', { p_username: 'Deli_Dan' })
  })

  it('lets the profile be cached briefly', async () => {
    const res = await lookup('deli_dan')

    expect(res._headers['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('says when nobody has that username', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const res = await lookup('nobody_here')

    expect(res._status).toBe(404)
    expect(errorOf(res).code).toBe('PROFILE_NOT_FOUND')
  })

  it('does not look up names that cannot be usernames', async () => {
    const res = await lookup('not a name')

    expect(res._status).toBe(404)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('fails clearly when the lookup fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await lookup('deli_dan')

    expect(res._status).toBe(500)
  })

  it('only answers GET requests', async () => {
    const res = await lookup('deli_dan', 'POST')

    expect(res._status).toBe(405)
  })
})
