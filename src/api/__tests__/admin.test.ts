import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createBlogCategory,
  deleteBlogCategory,
  fetchBlogCategories,
  updateBlogCategory,
  updateIngredient,
} from '@/api/admin'

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

describe('blog category requests', () => {
  const respondWith = (data: unknown) => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data }),
    } as unknown as Response)
  }

  const lastRequest = () => {
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    const body = init?.body
    return {
      url: typeof url === 'string' ? url : '',
      method: init?.method,
      headers: init?.headers,
      body: typeof body === 'string' ? body : '',
    }
  }

  it('loads the categories with the admin token', async () => {
    respondWith([{ slug: 'dietary' }])

    await expect(fetchBlogCategories('token-1')).resolves.toEqual([{ slug: 'dietary' }])

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/categories')
    expect(lastRequest().headers).toMatchObject({ Authorization: 'Bearer token-1' })
  })

  it('creates a category by posting its name and description', async () => {
    respondWith({ slug: 'best-pairings' })

    await createBlogCategory('token-1', { name: 'Best Pairings', description: 'Pairs' })

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/categories')
    expect(lastRequest().method).toBe('POST')
    expect(JSON.parse(lastRequest().body)).toEqual({ name: 'Best Pairings', description: 'Pairs' })
  })

  it('updates a category by its slug', async () => {
    respondWith({ slug: 'dietary' })

    await updateBlogCategory('token-1', 'dietary', { display_order: 2 })

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/categories/dietary')
    expect(lastRequest().method).toBe('PATCH')
    expect(JSON.parse(lastRequest().body)).toEqual({ display_order: 2 })
  })

  it('deletes a category by its slug', async () => {
    respondWith({ slug: 'dietary', deleted: true })

    await deleteBlogCategory('token-1', 'dietary')

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/categories/dietary')
    expect(lastRequest().method).toBe('DELETE')
  })
})
