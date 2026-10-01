import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'

const { mockFetchPosts } = vi.hoisted(() => ({ mockFetchPosts: vi.fn() }))

vi.mock('@/api/blog', () => ({ fetchBlogPosts: mockFetchPosts }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import BlogPostList from '@/components/blog/BlogPostList'

const makePost = (overrides: Record<string, unknown> = {}) => ({
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds that skip the meat.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 3,
  categories: [
    { slug: 'dietary', name: 'Dietary' },
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
  ],
  ...overrides,
})

const renderList = (category?: string) =>
  render(
    <MemoryRouter>
      <BlogPostList category={category} />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchPosts.mockResolvedValue({ items: [makePost()], totalCount: 1 })
})

describe('BlogPostList cards', () => {
  it('shows each post with its excerpt, date, reading time and category badges', async () => {
    renderList()

    const card = (await screen.findByRole('heading', { name: 'Vegan builds' })).closest('li')
    if (card === null) throw new Error('card not found')
    expect(within(card).getByText('Five builds that skip the meat.')).toBeInTheDocument()
    expect(within(card).getByText('Oct 1, 2026')).toBeInTheDocument()
    expect(within(card).getByText('3 min read')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Dietary' })).toHaveAttribute('href', '/blog/category/dietary')
    expect(within(card).getByRole('link', { name: 'Sandwich Ideas' })).toHaveAttribute('href', '/blog/category/sandwich-ideas')
  })

  it('links the title to the post', async () => {
    renderList()

    expect(await screen.findByRole('link', { name: 'Vegan builds' })).toHaveAttribute('href', '/blog/vegan-builds')
  })

  it('shows the cover image when there is one and a placeholder when there is not', async () => {
    mockFetchPosts.mockResolvedValue({
      items: [
        makePost({ cover_image_url: 'https://example.com/cover.jpg' }),
        makePost({ slug: 'no-cover', title: 'No cover' }),
      ],
      totalCount: 2,
    })
    renderList()

    const withCover = (await screen.findByRole('heading', { name: 'Vegan builds' })).closest('li')
    const withoutCover = screen.getByRole('heading', { name: 'No cover' }).closest('li')
    if (withCover === null || withoutCover === null) throw new Error('cards not found')
    expect(withCover.querySelector('img')).toHaveAttribute('src', 'https://example.com/cover.jpg')
    expect(withoutCover.querySelector('img')).toBeNull()
  })
})

describe('BlogPostList loading', () => {
  it('shows a loading state while fetching', () => {
    mockFetchPosts.mockReturnValue(new Promise(() => undefined))
    renderList()

    expect(screen.getByRole('status', { name: 'Loading posts' })).toBeInTheDocument()
  })

  it('asks for the first twelve posts, within the category when one is given', async () => {
    renderList('dietary')
    await screen.findByText('Vegan builds')

    expect(mockFetchPosts).toHaveBeenCalledWith({ category: 'dietary', limit: 12, offset: 0 })
  })

  it('says so when there are no posts', async () => {
    mockFetchPosts.mockResolvedValue({ items: [], totalCount: 0 })
    renderList()

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument()
  })

  it('shows an error and retries when asked', async () => {
    mockFetchPosts.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading posts.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Vegan builds')).toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenCalledTimes(2)
  })

  it('starts again from the first page when the category changes', async () => {
    const { rerender } = renderList()
    await screen.findByText('Vegan builds')
    mockFetchPosts.mockResolvedValue({ items: [makePost({ slug: 'other', title: 'Other post' })], totalCount: 1 })

    rerender(
      <MemoryRouter>
        <BlogPostList category="dietary" />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Other post')).toBeInTheDocument()
    expect(screen.queryByText('Vegan builds')).not.toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenLastCalledWith({ category: 'dietary', limit: 12, offset: 0 })
  })
})

describe('BlogPostList load more', () => {
  const firstPage = Array.from({ length: 12 }, (_value, index) => makePost({ slug: `post-${String(index)}`, title: `Post ${String(index)}` }))

  it('does not offer load more when every post is showing', async () => {
    renderList()
    await screen.findByText('Vegan builds')

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('loads the next twelve and appends them', async () => {
    mockFetchPosts.mockResolvedValueOnce({ items: firstPage, totalCount: 13 })
    mockFetchPosts.mockResolvedValueOnce({ items: [makePost({ slug: 'last', title: 'Last post' })], totalCount: 13 })
    const user = userEvent.setup()
    renderList()
    await screen.findByText('Post 0')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Last post')).toBeInTheDocument()
    expect(screen.getByText('Post 0')).toBeInTheDocument()
    expect(mockFetchPosts).toHaveBeenLastCalledWith({ category: undefined, limit: 12, offset: 12 })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows an error and keeps the posts when loading more fails', async () => {
    mockFetchPosts.mockResolvedValueOnce({ items: firstPage, totalCount: 13 })
    mockFetchPosts.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    renderList()
    await screen.findByText('Post 0')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to load more posts.') })
    expect(screen.getByText('Post 0')).toBeInTheDocument()
  })
})
