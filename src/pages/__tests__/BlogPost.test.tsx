import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { toast } from 'sonner'

const { mockFetchPost, mockPostViewed, mockPostShared, mockRelatedClicked, mockCategorySelected } = vi.hoisted(() => ({
  mockFetchPost: vi.fn(),
  mockPostViewed: vi.fn(),
  mockPostShared: vi.fn(),
  mockRelatedClicked: vi.fn(),
  mockCategorySelected: vi.fn(),
}))

vi.mock('@/api/blog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/blog')>()),
  fetchBlogPost: mockFetchPost,
}))
vi.mock('@/analytics/events', () => ({
  captureBlogPostViewed: mockPostViewed,
  captureBlogPostShared: mockPostShared,
  captureBlogRelatedSandwichClicked: mockRelatedClicked,
  captureBlogCategorySelected: mockCategorySelected,
}))
vi.mock('@/components/sandwich-page/CommentSection', () => ({
  default: (props: { targetType: string; slug: string; targetId: string }) => (
    <div data-testid="comments" data-target-type={props.targetType} data-slug={props.slug} data-target-id={props.targetId} />
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import BlogPost from '@/pages/BlogPost'

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds that skip the meat.',
  body: 'Some **bold** advice.',
  cover_image_url: 'https://cdn.example.com/cover.jpg',
  author_name: 'Dylan',
  meta_description: null,
  reading_time_minutes: 3,
  published_at: '2026-10-01T12:00:00.000Z',
  updated_at: '2026-10-02T12:00:00.000Z',
  categories: [
    { slug: 'dietary', name: 'Dietary' },
    { slug: 'sandwich-ideas', name: 'Sandwich Ideas' },
  ],
  related_sandwiches: [],
  more_posts: [],
  ...overrides,
})

const otherPost = (slug: string, title: string) => ({
  slug,
  title,
  excerpt: 'Another post.',
  cover_image_url: null,
  author_name: 'Dylan',
  published_at: '2026-09-01T12:00:00.000Z',
  reading_time_minutes: 2,
  categories: [{ slug: 'dietary', name: 'Dietary' }],
})

const renderAt = (slug = 'vegan-builds') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/blog/${slug}`]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

const headTag = (selector: string): Element | null => document.head.querySelector(selector)

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchPost.mockResolvedValue(makePost())
})

const sendWithPage = (path: string, data: unknown): void => {
  const script = document.createElement('script')
  script.type = 'application/json'
  script.id = 'initial-data'
  script.textContent = JSON.stringify({ path, data })
  document.body.appendChild(script)
}

describe('BlogPost sent with the page', () => {
  afterEach(() => { document.getElementById('initial-data')?.remove() })

  it('shows the post straight away without asking the server for it again', () => {
    sendWithPage('/blog/vegan-builds', makePost())

    renderAt()

    expect(screen.getByRole('heading', { level: 1, name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPost).not.toHaveBeenCalled()
    expect(mockPostViewed).toHaveBeenCalledWith({ slug: 'vegan-builds', categories: ['dietary', 'sandwich-ideas'] })
  })

  it('loads the post when the content sent was for another page', async () => {
    sendWithPage('/blog/other', makePost({ slug: 'other', title: 'Other' }))

    renderAt()

    expect(screen.getByRole('status', { name: 'Loading post' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPost).toHaveBeenCalledWith('vegan-builds')
  })

  it('loads the post when the content sent is incomplete', async () => {
    sendWithPage('/blog/vegan-builds', { slug: 'vegan-builds' })

    renderAt()

    expect(await screen.findByRole('heading', { level: 1, name: 'Vegan builds' })).toBeInTheDocument()
    expect(mockFetchPost).toHaveBeenCalledWith('vegan-builds')
  })
})

describe('BlogPost article', () => {
  it('shows the title, byline, categories and cover image', async () => {
    renderAt()

    expect(await screen.findByRole('heading', { level: 1, name: 'Vegan builds' })).toBeInTheDocument()
    expect(screen.getByText('By Dylan')).toBeInTheDocument()
    expect(screen.getByText('Oct 1, 2026')).toBeInTheDocument()
    expect(screen.getByText('3 min read')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dietary' })).toHaveAttribute('href', '/blog/category/dietary')
    expect(screen.getByRole('link', { name: 'Sandwich Ideas' })).toHaveAttribute('href', '/blog/category/sandwich-ideas')
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/cover.jpg')
    expect(document.querySelector('img')).not.toHaveAttribute('loading', 'lazy')
  })

  it('asks for the post named in the address', async () => {
    renderAt('vegan-builds')
    await screen.findByRole('heading', { level: 1 })

    expect(mockFetchPost).toHaveBeenCalledWith('vegan-builds')
  })

  it('shows no picture when the post has no cover image', async () => {
    mockFetchPost.mockResolvedValue(makePost({ cover_image_url: null }))
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(document.querySelector('img')).toBeNull()
  })

  it('renders the body as formatted text', async () => {
    renderAt()

    expect((await screen.findByText('bold')).tagName).toBe('STRONG')
  })

  it('does not render raw HTML or javascript links from the body', async () => {
    mockFetchPost.mockResolvedValue(
      makePost({ cover_image_url: null, body: 'Hi <script>alert(1)</script> [click](javascript:alert(1))' }),
    )
    const { container } = renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(container.querySelector('script')).toBeNull()
    expect(screen.queryByRole('link', { name: 'click' })?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
  })

  it('shows a loading state while the post loads', () => {
    mockFetchPost.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status', { name: 'Loading post' })).toBeInTheDocument()
  })
})

describe('BlogPost sharing', () => {
  it('copies the link to the clipboard and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Share' }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(toast.success).toHaveBeenCalledWith('Link copied to clipboard!')
  })

  it('says so when the link cannot be copied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Share' }))

    expect(toast.error).toHaveBeenCalledWith('Failed to copy link. Please try again.')
  })
})

describe('BlogPost related content', () => {
  it('shows the sandwiches the post is about', async () => {
    mockFetchPost.mockResolvedValue(
      makePost({
        related_sandwiches: [
          { name: 'Reuben', slug: 'reuben', image_url: null, description: 'Corned beef on rye.' },
          { name: 'Cubano', slug: 'cubano', image_url: 'https://cdn.example.com/cubano.jpg', description: null },
        ],
      }),
    )
    renderAt()

    const section = (await screen.findByRole('heading', { name: 'Sandwiches in this post' })).closest('section')
    if (section === null) throw new Error('section not found')
    expect(within(section).getByRole('link', { name: /Reuben/ })).toHaveAttribute('href', '/sandwiches/reuben')
    expect(within(section).getByRole('link', { name: /Cubano/ })).toHaveAttribute('href', '/sandwiches/cubano')
    expect(within(section).getByText('Corned beef on rye.')).toBeInTheDocument()
    expect(section.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('leaves the sandwiches section out when the post links to none', async () => {
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('heading', { name: 'Sandwiches in this post' })).not.toBeInTheDocument()
  })

  it('suggests more posts from the blog', async () => {
    mockFetchPost.mockResolvedValue(
      makePost({ more_posts: [otherPost('second', 'Second post'), otherPost('third', 'Third post')] }),
    )
    renderAt()

    const section = (await screen.findByRole('heading', { name: 'More from the blog' })).closest('section')
    if (section === null) throw new Error('section not found')
    expect(within(section).getByRole('link', { name: 'Second post' })).toHaveAttribute('href', '/blog/second')
    expect(within(section).getByRole('link', { name: 'Third post' })).toHaveAttribute('href', '/blog/third')
  })

  it('leaves the more-posts section out when there are none', async () => {
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('heading', { name: 'More from the blog' })).not.toBeInTheDocument()
  })
})

describe('BlogPost analytics', () => {
  it('records that the post was viewed with its category slugs', async () => {
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(mockPostViewed).toHaveBeenCalledTimes(1)
    expect(mockPostViewed).toHaveBeenCalledWith({ slug: 'vegan-builds', categories: ['dietary', 'sandwich-ideas'] })
  })

  it('does not record a view for a post that does not exist', async () => {
    mockFetchPost.mockResolvedValue(null)
    renderAt('missing')
    await screen.findByRole('heading', { name: 'Post not found' })

    expect(mockPostViewed).not.toHaveBeenCalled()
  })

  it('records a share only when the link was copied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Share' }))

    expect(mockPostShared).toHaveBeenCalledWith({ slug: 'vegan-builds' })
  })

  it('does not record a share when copying fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    renderAt()

    await userEvent.click(await screen.findByRole('button', { name: 'Share' }))

    expect(mockPostShared).not.toHaveBeenCalled()
  })

  it('records which related sandwich a reader opens', async () => {
    mockFetchPost.mockResolvedValue(
      makePost({ related_sandwiches: [{ name: 'Reuben', slug: 'reuben', image_url: null, description: null }] }),
    )
    const user = userEvent.setup()
    renderAt()

    await user.click(await screen.findByRole('link', { name: /Reuben/ }))

    expect(mockRelatedClicked).toHaveBeenCalledWith({ postSlug: 'vegan-builds', sandwichSlug: 'reuben' })
  })

  it('records which category a reader picks from the post', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(await screen.findByRole('link', { name: 'Dietary' }))

    expect(mockCategorySelected).toHaveBeenCalledWith({ category: 'dietary' })
  })
})

describe('BlogPost comments', () => {
  it('shows the comment section for this post', async () => {
    renderAt()

    const comments = await screen.findByTestId('comments')
    expect(comments).toHaveAttribute('data-target-type', 'blog')
    expect(comments).toHaveAttribute('data-slug', 'vegan-builds')
    expect(comments).toHaveAttribute('data-target-id', 'p-1')
  })

  it('does not show comments while the post is loading or missing', async () => {
    mockFetchPost.mockResolvedValue(null)
    renderAt('missing')
    await screen.findByRole('heading', { name: 'Post not found' })

    expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
  })
})

describe('BlogPost page details', () => {
  it('sets the browser title, description, canonical address and social tags', async () => {
    renderAt()

    await waitFor(() => {
      expect(document.title).toBe('Vegan builds | Between the Bread')
      expect(headTag('meta[name="description"]')).toHaveAttribute('content', 'Five builds that skip the meat.')
      expect(headTag('link[rel="canonical"]')).toHaveAttribute('href', 'https://betweenbread.co/blog/vegan-builds')
      expect(headTag('meta[property="og:title"]')).toHaveAttribute('content', 'Vegan builds')
      expect(headTag('meta[property="og:description"]')).toHaveAttribute('content', 'Five builds that skip the meat.')
      expect(headTag('meta[property="og:image"]')).toHaveAttribute('content', 'https://cdn.example.com/cover.jpg')
      expect(headTag('meta[property="og:url"]')).toHaveAttribute('content', 'https://betweenbread.co/blog/vegan-builds')
      expect(headTag('meta[property="og:type"]')).toHaveAttribute('content', 'article')
      expect(headTag('meta[property="article:published_time"]')).toHaveAttribute('content', '2026-10-01T12:00:00.000Z')
    })
  })

  it('prefers the meta description over the excerpt', async () => {
    mockFetchPost.mockResolvedValue(makePost({ meta_description: 'Written for search engines.' }))
    renderAt()

    await waitFor(() => {
      expect(headTag('meta[name="description"]')).toHaveAttribute('content', 'Written for search engines.')
    })
  })
})

describe('BlogPost structured data', () => {
  const structuredData = (): Record<string, unknown> | null => {
    const script = document.head.querySelector('script[type="application/ld+json"]')
    return script === null ? null : (JSON.parse(script.textContent) as Record<string, unknown>)
  }

  it('describes the post to search engines as a blog posting', async () => {
    renderAt()

    await waitFor(() => { expect(structuredData()).not.toBeNull() })
    expect(structuredData()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Vegan builds',
      description: 'Five builds that skip the meat.',
      image: 'https://cdn.example.com/cover.jpg',
      datePublished: '2026-10-01T12:00:00.000Z',
      dateModified: '2026-10-02T12:00:00.000Z',
      author: { '@type': 'Person', name: 'Dylan' },
      publisher: { '@type': 'Organization', name: 'Between the Bread' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://betweenbread.co/blog/vegan-builds' },
    })
  })

  it('leaves out the image when the post has no cover image', async () => {
    mockFetchPost.mockResolvedValue(makePost({ cover_image_url: null }))
    renderAt()

    await waitFor(() => { expect(structuredData()).not.toBeNull() })
    expect(structuredData()).not.toHaveProperty('image')
  })

  it('cannot be broken out of by text in the post', async () => {
    mockFetchPost.mockResolvedValue(makePost({ title: 'Evil </script><script>alert(1)</script>' }))
    renderAt()

    await waitFor(() => { expect(structuredData()).not.toBeNull() })
    const script = document.head.querySelector('script[type="application/ld+json"]')
    expect(script?.textContent).not.toContain('</script')
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
    expect(structuredData()?.headline).toBe('Evil </script><script>alert(1)</script>')
  })
})

describe('BlogPost problems', () => {
  it('says so when the post does not exist', async () => {
    mockFetchPost.mockResolvedValue(null)
    renderAt('missing')

    expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the blog' })).toHaveAttribute('href', '/blog')
  })

  it('shows an error and retries when the post cannot be loaded', async () => {
    mockFetchPost.mockRejectedValueOnce(new Error('nope'))
    const user = userEvent.setup()
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading this post.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Vegan builds' })).toBeInTheDocument()
  })
})
