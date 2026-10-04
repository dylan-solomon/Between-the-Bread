import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { clearSentData, sendWithPage } from '@/test/initialData'

const { mockFetchPosts, mockFetchCategories, mockBlogViewed } = vi.hoisted(() => ({
  mockFetchPosts: vi.fn(),
  mockFetchCategories: vi.fn(),
  mockBlogViewed: vi.fn(),
}))

vi.mock('@/api/blog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/blog')>()),
  fetchBlogPosts: mockFetchPosts,
  fetchPublicBlogCategories: mockFetchCategories,
}))

vi.mock('@/analytics/events', () => ({
  captureBlogViewed: mockBlogViewed,
  captureBlogCategorySelected: vi.fn(),
}))

import BlogIndex from '@/pages/BlogIndex'
import { accessibilityProblems } from '@/test/accessibility'

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
  it('records that the blog was viewed, once', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Vegan builds' })

    expect(mockBlogViewed).toHaveBeenCalledTimes(1)
  })

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

describe('BlogIndex sent with the page', () => {
  afterEach(clearSentData)

  it('shows the categories and posts straight away without asking the server again', () => {
    sendWithPage('/blog', { categories, posts: { items: [post], totalCount: 1 } })

    renderPage()

    expect(screen.getByRole('link', { name: 'Vegan builds' })).toHaveAttribute('href', '/blog/vegan-builds')
    expect(screen.getByRole('link', { name: 'Sandwich Ideas' })).toHaveAttribute('href', '/blog/category/sandwich-ideas')
    expect(mockFetchPosts).not.toHaveBeenCalled()
    expect(mockFetchCategories).not.toHaveBeenCalled()
  })

  it('loads everything when the content sent is incomplete', async () => {
    sendWithPage('/blog', { categories })

    renderPage()

    expect(await screen.findByRole('link', { name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenCalled()
    expect(mockFetchCategories).toHaveBeenCalled()
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    renderPage()
    await screen.findByRole('link', { name: 'Vegan builds' })

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
