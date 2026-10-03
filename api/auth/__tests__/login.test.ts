import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockGetUserById, mockSignIn } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetUserById: vi.fn(),
  mockSignIn: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) =>
    key === 'service-role-key'
      ? { rpc: mockRpc, auth: { admin: { getUserById: mockGetUserById } } }
      : { auth: { signInWithPassword: mockSignIn } },
}))

import handler from '../login.js'
import { dataOf, errorOf, makeReq, makeRes } from '../../_lib/__tests__/supabaseMock.js'

const session = { access_token: 'access-1', refresh_token: 'refresh-1' }

const answerRpc = ({ attempts = 1, userId = 'user-1' as string | null } = {}) => {
  mockRpc.mockImplementation((name: string) =>
    Promise.resolve(
      name === 'record_login_attempt' ? { data: attempts, error: null } : { data: userId, error: null },
    ),
  )
}

const login = async (body: unknown, headers: Record<string, string> = { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }) => {
  const res = makeRes()
  await handler(makeReq({ method: 'POST', body, headers }), res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
  answerRpc()
  mockGetUserById.mockResolvedValue({ data: { user: { id: 'user-1', email: 'dan@example.com' } }, error: null })
  mockSignIn.mockResolvedValue({ data: { session }, error: null })
})

describe('POST /api/auth/login', () => {
  it('signs in with the email that belongs to the username', async () => {
    const res = await login({ username: 'Deli_Dan', password: 'secret123' })

    expect(res._status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('user_id_for_username', { p_username: 'Deli_Dan' })
    expect(mockGetUserById).toHaveBeenCalledWith('user-1')
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'dan@example.com', password: 'secret123' })
    expect(dataOf(res)).toEqual({ access_token: 'access-1', refresh_token: 'refresh-1' })
  })

  it('never sends the email address back', async () => {
    const res = await login({ username: 'deli_dan', password: 'secret123' })

    expect(JSON.stringify(res._json)).not.toContain('dan@example.com')
  })

  it('counts each attempt against the first forwarded address', async () => {
    await login({ username: 'deli_dan', password: 'secret123' })

    expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', { p_ip: '1.2.3.4', p_window_minutes: 15 })
  })

  it('stops after too many attempts from one address', async () => {
    answerRpc({ attempts: 11 })

    const res = await login({ username: 'deli_dan', password: 'secret123' })

    expect(res._status).toBe(429)
    expect(errorOf(res).code).toBe('TOO_MANY_ATTEMPTS')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('allows the tenth attempt', async () => {
    answerRpc({ attempts: 10 })

    const res = await login({ username: 'deli_dan', password: 'secret123' })

    expect(res._status).toBe(200)
  })

  it.each([
    ['an unknown username', () => { answerRpc({ userId: null }) }],
    ['a wrong password', () => { mockSignIn.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } }) }],
    ['an account with no email', () => { mockGetUserById.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) }],
  ])('gives the same answer for %s', async (_label, arrange) => {
    arrange()

    const res = await login({ username: 'deli_dan', password: 'secret123' })

    expect(res._status).toBe(401)
    expect(errorOf(res)).toMatchObject({ code: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' })
  })

  it.each([
    [{ username: 'not a name', password: 'secret123' }],
    [{ username: 'deli_dan', password: '' }],
    [{ username: 'deli_dan' }],
    [{}],
  ])('rejects %j without looking anyone up', async (body) => {
    const res = await login(body)

    expect(res._status).toBe(401)
    expect(mockGetUserById).not.toHaveBeenCalled()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('fails clearly when the server is not set up', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    const res = await login({ username: 'deli_dan', password: 'secret123' })

    expect(res._status).toBe(500)
  })

  it('only answers POST requests', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)

    expect(res._status).toBe(405)
  })
})
