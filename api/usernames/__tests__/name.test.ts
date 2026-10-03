import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({ supabase: { rpc: mockRpc } }))

import handler from '../[name].js'
import { dataOf, errorOf, makeReq, makeRes } from '../../_lib/__tests__/supabaseMock.js'

const check = async (name: unknown, method = 'GET') => {
  const res = makeRes()
  await handler(makeReq({ method, query: { name } as Record<string, string> }), res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRpc.mockResolvedValue({ data: 'available', error: null })
})

describe('GET /api/usernames/:name', () => {
  it('reports a free username as available', async () => {
    const res = await check('sandwich_fan')

    expect(res._status).toBe(200)
    expect(dataOf(res)).toEqual({ username: 'sandwich_fan', status: 'available' })
    expect(mockRpc).toHaveBeenCalledWith('username_status', { p_username: 'sandwich_fan' })
  })

  it.each(['taken', 'reserved'])('passes on a %s answer from the database', async (status) => {
    mockRpc.mockResolvedValue({ data: status, error: null })

    const res = await check('admin')

    expect(dataOf(res)).toEqual({ username: 'admin', status })
  })

  it.each(['ab', 'a'.repeat(21), 'has space', 'émile', 'dash-name'])(
    'reports %s as invalid without asking the database',
    async (name) => {
      const res = await check(name)

      expect(dataOf(res)).toEqual({ username: name, status: 'invalid' })
      expect(mockRpc).not.toHaveBeenCalled()
    },
  )

  it('rejects a missing name', async () => {
    const res = await check(undefined)

    expect(res._status).toBe(400)
    expect(errorOf(res).code).toBe('INVALID_INPUT')
  })

  it('fails clearly when the database check fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const res = await check('sandwich_fan')

    expect(res._status).toBe(500)
    expect(errorOf(res).code).toBe('INTERNAL_ERROR')
  })

  it('treats an unexpected database answer as an error', async () => {
    mockRpc.mockResolvedValue({ data: 'maybe', error: null })

    const res = await check('sandwich_fan')

    expect(res._status).toBe(500)
  })

  it('only answers GET requests', async () => {
    const res = await check('sandwich_fan', 'POST')

    expect(res._status).toBe(405)
  })
})
