import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkUsername, fetchOwnUsername, saveUsername, usernameFormatProblem } from '@/api/usernames'

const respondWith = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  vi.mocked(fetch).mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', { value: { origin: 'https://betweenbread.co' }, configurable: true })
})

describe('usernameFormatProblem', () => {
  it.each(['abc', 'Sandwich_Fan', 'a'.repeat(20), 'user_123'])('accepts %s', (name) => {
    expect(usernameFormatProblem(name)).toBeNull()
  })

  it.each(['ab', '', 'a'.repeat(21)])('explains the length rule for %s', (name) => {
    expect(usernameFormatProblem(name)).toBe('Usernames are 3 to 20 characters long.')
  })

  it.each(['has space', 'dash-name', 'émile', 'dot.name'])('explains the character rule for %s', (name) => {
    expect(usernameFormatProblem(name)).toBe('Use only letters, numbers and underscores.')
  })
})

describe('checkUsername', () => {
  it('asks the server whether the name is free', async () => {
    respondWith({ data: { username: 'sandwich_fan', status: 'taken' } })

    await expect(checkUsername('sandwich_fan')).resolves.toBe('taken')
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://betweenbread.co/api/usernames/sandwich_fan')
  })

  it('fails when the server cannot check', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(checkUsername('sandwich_fan')).rejects.toThrow()
  })

  it('fails when the server answer is not recognised', async () => {
    respondWith({ data: { status: 'maybe' } })

    await expect(checkUsername('sandwich_fan')).rejects.toThrow()
  })
})

describe('saveUsername', () => {
  it('saves the username to the signed-in profile', async () => {
    respondWith({ data: { updated: ['username'] } })

    await saveUsername({ token: 'token-abc', username: 'sandwich_fan' })

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://betweenbread.co/api/profile')
    expect(init).toMatchObject({ method: 'PATCH', headers: { Authorization: 'Bearer token-abc' } })
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({ username: 'sandwich_fan' })
  })

  it.each([
    ['USERNAME_TAKEN', 409, 'That username is already taken.'],
    ['USERNAME_RESERVED', 400, "That username isn't available."],
    ['USERNAME_INVALID', 400, 'Usernames are 3 to 20 letters, numbers or underscores.'],
    ['UPDATE_FAILED', 500, "Couldn't save your username. Please try again."],
  ])('explains a %s answer', async (code, status, message) => {
    respondWith({ error: { code } }, { ok: false, status })

    await expect(saveUsername({ token: 't', username: 'sandwich_fan' })).rejects.toThrow(message)
  })
})

describe('fetchOwnUsername', () => {
  it('reads the username from the signed-in profile', async () => {
    respondWith({ data: { profile: { username: 'sandwich_fan', display_name: null } } })

    await expect(fetchOwnUsername('token-abc')).resolves.toBe('sandwich_fan')
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://betweenbread.co/api/profile')
    expect(init).toMatchObject({ headers: { Authorization: 'Bearer token-abc' } })
  })

  it('returns null when the person has not chosen one', async () => {
    respondWith({ data: { profile: { username: null } } })

    await expect(fetchOwnUsername('token-abc')).resolves.toBeNull()
  })

  it('fails when the profile cannot be loaded', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(fetchOwnUsername('token-abc')).rejects.toThrow()
  })
})
