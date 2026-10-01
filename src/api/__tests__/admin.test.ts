import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createBlogCategory,
  createPost,
  deletePost,
  fetchAdminPosts,
  updatePost,
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

  it('keeps the explanation the server gave so pages can show it', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { code: 'INVALID_INPUT', message: 'That slug is reserved.', status: 400 } }),
    } as unknown as Response)

    await expect(createPost('token', {
      title: 'Hi',
      slug: 'hi',
      excerpt: '',
      body: '',
      cover_image_url: null,
      meta_description: null,
      author_name: 'Dylan',
      related_sandwich_slugs: [],
      published: false,
      category_slugs: [],
    })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      detail: 'That slug is reserved.',
    })
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

describe('blog post requests', () => {
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
      body: typeof body === 'string' ? body : '',
    }
  }

  const input = {
    title: 'Vegan builds',
    slug: 'vegan-builds',
    excerpt: '',
    body: '',
    cover_image_url: null,
    meta_description: null,
    author_name: 'Dylan',
    related_sandwich_slugs: [],
    published: false,
    category_slugs: ['dietary'],
  }

  it('loads every post', async () => {
    respondWith([{ slug: 'vegan-builds' }])

    await expect(fetchAdminPosts('token-1')).resolves.toEqual([{ slug: 'vegan-builds' }])

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog')
  })

  it('creates a post by posting its fields', async () => {
    respondWith({ slug: 'vegan-builds' })

    await createPost('token-1', input)

    expect(lastRequest().method).toBe('POST')
    expect(JSON.parse(lastRequest().body)).toEqual(input)
  })

  it('updates a post by its slug', async () => {
    respondWith({ slug: 'vegan-builds' })

    await updatePost('token-1', 'vegan-builds', { published: false })

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/vegan-builds')
    expect(lastRequest().method).toBe('PATCH')
    expect(JSON.parse(lastRequest().body)).toEqual({ published: false })
  })

  it('deletes a post permanently', async () => {
    respondWith({ slug: 'vegan-builds', deleted: true })

    await deletePost('token-1', 'vegan-builds')

    expect(lastRequest().url).toBe('https://betweenbread.co/api/admin/blog/vegan-builds?permanent=true')
    expect(lastRequest().method).toBe('DELETE')
  })
})
