import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const { mockFetchPosts, mockFetchCategories } = vi.hoisted(() => ({
  mockFetchPosts: vi.fn(),
  mockFetchCategories: vi.fn(),
}))

vi.mock('@/api/blog', () => ({
  fetchBlogPosts: mockFetchPosts,
  fetchPublicBlogCategories: mockFetchCategories,
}))

import BlogCategory from '@/pages/BlogCategory'

const post = {
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  categories: [{ slug: 'dietary', name: 'Dietary' }],
}

const dietary = { slug: 'dietary', name: 'Dietary', description: 'Vegan, gluten-free and more.', post_count: 1 }
const ideas = { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, post_count: 2 }
const empty = { slug: 'best-pairings', name: 'Best Pairings', description: null, post_count: 0 }

const renderAt = (slug: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/blog/category/${slug}`]}>
        <Routes>
          <Route path="/blog/category/:slug" element={<BlogCategory />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchPosts.mockResolvedValue({ items: [post], totalCount: 1 })
  mockFetchCategories.mockResolvedValue([ideas, dietary, empty])
})

describe('BlogCategory', () => {
  it('shows the category name and description above its posts', async () => {
    renderAt('dietary')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dietary' })).toBeInTheDocument()
    expect(screen.getByText('Vegan, gluten-free and more.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenCalledWith({ category: 'dietary', limit: 12, offset: 0 })
  })

  it('marks the category as current in the category links', async () => {
    renderAt('dietary')

    await screen.findByRole('heading', { level: 1, name: 'Dietary' })
    const nav = within(screen.getByRole('navigation', { name: 'Blog categories' }))
    expect(nav.getByRole('link', { name: 'Dietary' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
  })

  it('has its own title, description and canonical address', async () => {
    renderAt('dietary')

    await waitFor(() => {
      expect(document.title).toBe('Dietary | Blog | Between the Bread')
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Vegan, gluten-free and more.')
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://betweenbread.co/blog/category/dietary',
      )
    })
  })

  it('writes a description when the category has none', async () => {
    renderAt('sandwich-ideas')

    await waitFor(() => {
      expect(document.title).toBe('Sandwich Ideas | Blog | Between the Bread')
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        'Sandwich Ideas posts from Between the Bread.',
      )
    })
  })

  it('shows a loading state while the category is looked up', () => {
    mockFetchCategories.mockReturnValue(new Promise(() => undefined))
    renderAt('dietary')

    expect(screen.getByRole('status', { name: 'Loading category' })).toBeInTheDocument()
  })

  it.each([
    ['a category that does not exist', 'made-up'],
    ['a category with no live posts', 'best-pairings'],
  ])('shows a not-found message for %s', async (_label, slug) => {
    renderAt(slug)

    expect(await screen.findByText('Category not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the blog' })).toHaveAttribute('href', '/blog')
    expect(mockFetchPosts).not.toHaveBeenCalled()
  })

  it('shows an error and retries when the categories cannot be loaded', async () => {
    mockFetchCategories.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    renderAt('dietary')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading this category.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Dietary' })).toBeInTheDocument()
  })
})
