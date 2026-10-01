import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const { mockFetchPosts, mockFetchCategories } = vi.hoisted(() => ({
  mockFetchPosts: vi.fn(),
  mockFetchCategories: vi.fn(),
}))

vi.mock('@/api/blog', () => ({
  fetchBlogPosts: mockFetchPosts,
  fetchPublicBlogCategories: mockFetchCategories,
}))

import BlogIndex from '@/pages/BlogIndex'

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

const categories = [
  { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, post_count: 2 },
  { slug: 'dietary', name: 'Dietary', description: null, post_count: 1 },
]

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/blog']}>
        <BlogIndex />
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchPosts.mockResolvedValue({ items: [post], totalCount: 1 })
  mockFetchCategories.mockResolvedValue(categories)
})

describe('BlogIndex', () => {
  it('has a heading and an introduction', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument()
    expect(screen.getByText('Sandwich stories, guides and ideas.')).toBeInTheDocument()
  })

  it('sets the browser title and description', async () => {
    renderPage()

    await waitFor(() => {
      expect(document.title).toBe('Blog | Between the Bread')
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        'Sandwich stories, guides and ideas from Between the Bread.',
      )
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://betweenbread.co/blog')
    })
  })

  it('lets feed readers discover the RSS feed', async () => {
    renderPage()

    await waitFor(() => {
      expect(document.head.querySelector('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
        'href',
        'https://betweenbread.co/blog/rss.xml',
      )
    })
  })

  it('lists the posts across all categories', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenCalledWith({ category: undefined, limit: 12, offset: 0 })
  })

  it('shows the category links with All selected', async () => {
    renderPage()

    expect(await screen.findByRole('link', { name: 'Sandwich Ideas' })).toHaveAttribute('href', '/blog/category/sandwich-ideas')
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page')
  })

  it('still shows the posts when the categories cannot be loaded', async () => {
    mockFetchCategories.mockRejectedValue(new Error('nope'))
    renderPage()

    expect(await screen.findByRole('link', { name: 'Vegan builds' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Blog categories' })).not.toBeInTheDocument()
  })
})
