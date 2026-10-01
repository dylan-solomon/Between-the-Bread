import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateIngredient } from '@/api/admin'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://betweenbread.co' },
    configurable: true,
  })
})

describe('admin requests', () => {
  it('reports the error code the server sent so pages can explain what went wrong', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { code: 'INCOMPLETE_INGREDIENT', message: 'Add data.', status: 400 } }),
    } as unknown as Response)

    await expect(updateIngredient('token', 'ing-1', { enabled: true })).rejects.toMatchObject({ code: 'INCOMPLETE_INGREDIENT' })
  })

  it('still fails with a status message when the error body cannot be read', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(updateIngredient('token', 'ing-1', { enabled: true })).rejects.toThrow('502')
  })

  it('returns the data on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: 'ing-1', enabled: true } }),
    } as unknown as Response)

    await expect(updateIngredient('token', 'ing-1', { enabled: true })).resolves.toEqual({ id: 'ing-1', enabled: true })
  })
})
