import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPublicProfile } from '@/api/profiles'

const respondWith = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  vi.mocked(fetch).mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

const profile = { username: 'deli_dan', is_admin: true, joined_at: '2026-09-01T12:00:00Z', comment_count: 7 }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', { value: { origin: 'https://betweenbread.co' }, configurable: true })
})

describe('fetchPublicProfile', () => {
  it('loads a profile by username', async () => {
    respondWith({ data: profile })

    await expect(fetchPublicProfile('deli_dan')).resolves.toEqual(profile)
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://betweenbread.co/api/profiles/deli_dan')
  })

  it('returns null when nobody has that username', async () => {
    respondWith({}, { ok: false, status: 404 })

    await expect(fetchPublicProfile('nobody')).resolves.toBeNull()
  })

  it('fails on other errors', async () => {
    respondWith({}, { ok: false, status: 500 })

    await expect(fetchPublicProfile('deli_dan')).rejects.toThrow()
  })

  it('fails when the answer is not a profile', async () => {
    respondWith({ data: { username: 'deli_dan' } })

    await expect(fetchPublicProfile('deli_dan')).rejects.toThrow()
  })
})
