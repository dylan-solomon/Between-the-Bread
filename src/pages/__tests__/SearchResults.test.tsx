import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const { mockSearch, mockUseAuth, mockPerformed, mockClicked, mockHasUsedSearch } = vi.hoisted(() => ({
  mockHasUsedSearch: vi.fn(),
  mockSearch: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPerformed: vi.fn(),
  mockClicked: vi.fn(),
}))

vi.mock('@/api/search', () => ({ searchSite: mockSearch }))
vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/analytics/events', () => ({ captureSearchPerformed: mockPerformed, captureSearchResultClicked: mockClicked }))
vi.mock('@/analytics/userProperties', () => ({ setHasUsedSearch: mockHasUsedSearch }))

import { TooManyRequestsError } from '@/api/errors'
import SearchResults from '@/pages/SearchResults'

const encyclopediaResult = {
  source: 'database',
  slug: 'reuben',
  title: 'Reuben',
  details: {
    description: 'Corned beef on rye.',
    image_url: null,
    origin_country: 'United States',
    alternative_names: [],
    dietary_tags: [],
    avg_rating: 4.5,
    rating_count: 12,
  },
}

const communityResult = {
  source: 'community',
  slug: 'reuben-melt-abc12345',
  title: 'Reuben Melt',
  details: {
    fun_name: 'The Big Melt',
    composition: { bread: [{ slug: 'rye', name: 'Rye' }] },
    dietary_tags: [],
    generated_count: 3,
    avg_rating: null,
    rating_count: 0,
  },
}

const blogResult = {
  source: 'blog',
  slug: 'best-reubens',
  title: 'Best Reuben Variations',
  details: { excerpt: 'Five ways to make it.', cover_image_url: null, published_at: '2026-10-01T12:00:00Z', reading_time_minutes: 4 },
}

const savedResult = {
  source: 'saved',
  slug: 'saved-1',
  title: 'My Reuben',
  details: {
    composition: { bread: [{ slug: 'rye', name: 'Rye' }] },
    rating: 5,
    is_favorite: true,
    created_at: '2026-09-20T12:00:00Z',
  },
}

const page = (items: unknown[], counts: Record<string, number | null> = { database: 1, community: 1, blog: 1, saved: null }, totalCount = 3) => ({
  items,
  counts,
  totalCount,
})

function ShowSearch() {
  return <p data-testid="search">{useLocation().search}</p>
}

const renderAt = (url = '/search?q=reuben') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <SearchResults />
        <ShowSearch />
      </MemoryRouter>
    </HelmetProvider>,
  )

const lastQuery = (): Record<string, unknown> => (mockSearch.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, session: null, loading: false })
  mockSearch.mockResolvedValue(page([encyclopediaResult, communityResult, blogResult]))
})

describe('SearchResults without a search', () => {
  it('invites a search and searches nothing', () => {
    renderAt('/search')

    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    expect(screen.getByText(/Search classic sandwiches, community creations/)).toBeInTheDocument()
    expect(mockSearch).not.toHaveBeenCalled()
  })
})

describe('SearchResults', () => {
  it('searches everything for the words in the address, 20 at a time', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(lastQuery()).toEqual({ q: 'reuben', source: 'all', diet: [], limit: 20, offset: 0, token: undefined })
    expect(screen.getByRole('heading', { level: 1, name: 'Results for "reuben"' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('reuben')
  })

  it('waits for the sign-in check before searching', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: true })
    renderAt()

    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('includes the signed-in person\'s history', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, session: { access_token: 'token-abc' }, loading: false })
    renderAt()
    await screen.findByText('Reuben')

    expect(lastQuery()).toMatchObject({ token: 'token-abc' })
  })

  it('shows an encyclopedia result', async () => {
    renderAt()

    const link = await screen.findByRole('link', { name: /^Reuben/ })
    expect(link).toHaveAttribute('href', '/sandwiches/reuben')
    expect(within(link).getByText('Classic Sandwich')).toBeInTheDocument()
    expect(within(link).getByText('Corned beef on rye.')).toBeInTheDocument()
    expect(within(link).getByText('United States · ★ 4.5 (12)')).toBeInTheDocument()
  })

  it('loads result pictures only when they scroll into view', async () => {
    mockSearch.mockResolvedValue(page([{ ...encyclopediaResult, details: { ...encyclopediaResult.details, image_url: 'https://cdn.example.com/reuben.jpg' } }]))
    renderAt()

    const link = await screen.findByRole('link', { name: /^Reuben/ })
    expect(link.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('shows a community result', async () => {
    renderAt()

    const link = await screen.findByRole('link', { name: /Reuben Melt/ })
    expect(link).toHaveAttribute('href', '/community/reuben-melt-abc12345')
    expect(within(link).getByText('Community')).toBeInTheDocument()
    expect(within(link).getByText('The Big Melt')).toBeInTheDocument()
    expect(within(link).getByText('Made 3 times · Not yet rated')).toBeInTheDocument()
    expect(within(link).getAllByLabelText('Rye')).toHaveLength(2)
  })

  it('shows a blog result', async () => {
    renderAt()

    const link = await screen.findByRole('link', { name: /Best Reuben Variations/ })
    expect(link).toHaveAttribute('href', '/blog/best-reubens')
    expect(within(link).getByText('Blog')).toBeInTheDocument()
    expect(within(link).getByText('Five ways to make it.')).toBeInTheDocument()
    expect(within(link).getByText('Oct 1, 2026 · 4 min read')).toBeInTheDocument()
  })

  it('shows a saved sandwich from the person\'s history', async () => {
    mockSearch.mockResolvedValue(page([savedResult], { database: 0, community: 0, blog: 0, saved: 1 }, 1))
    renderAt()

    const link = await screen.findByRole('link', { name: /My Reuben/ })
    expect(link).toHaveAttribute('href', '/account/history?q=My+Reuben')
    expect(within(link).getByText('My History')).toBeInTheDocument()
    expect(within(link).getByText('Saved Sep 20, 2026 · ★ 5 · Favorite')).toBeInTheDocument()
  })

  it('keeps the search out of search engines', async () => {
    renderAt()
    await screen.findByText('Reuben')

    await waitFor(() => {
      expect(document.title).toBe('Search: reuben | Between the Bread')
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    })
  })

  it('searches again from the search box', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    const box = screen.getByRole('searchbox', { name: 'Search' })
    await user.clear(box)
    await user.type(box, 'cubano{Enter}')

    await waitFor(() => { expect(lastQuery()).toMatchObject({ q: 'cubano', offset: 0 }) })
    expect(screen.getByTestId('search')).toHaveTextContent('q=cubano')
  })
})

describe('SearchResults tabs', () => {
  it('offers a tab per source with its count, without history for visitors', async () => {
    mockSearch.mockResolvedValue(page([encyclopediaResult], { database: 2, community: 1, blog: 4, saved: null }, 7))
    renderAt()
    await screen.findByText('Reuben')

    const tabs = within(screen.getByRole('group', { name: 'Results from' })).getAllByRole('button')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['All (7)', 'Classic Sandwiches (2)', 'Community (1)', 'Blog (4)'])
    expect(screen.getByRole('button', { name: 'All (7)' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds a My History tab for signed-in people', async () => {
    mockSearch.mockResolvedValue(page([encyclopediaResult], { database: 2, community: 1, blog: 4, saved: 3 }, 10))
    renderAt()

    expect(await screen.findByRole('button', { name: 'My History (3)' })).toBeInTheDocument()
  })

  it('shows one source when its tab is picked', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: /Blog/ }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ source: 'blog', offset: 0 }) })
    expect(screen.getByTestId('search')).toHaveTextContent('source=blog')
  })

  it('keeps the tab counts while a single tab loads', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')
    mockSearch.mockReturnValue(new Promise(() => undefined))

    await user.click(screen.getByRole('button', { name: /Blog/ }))

    expect(screen.getByRole('button', { name: 'Blog (1)' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SearchResults dietary filters', () => {
  it('filters by diet and explains what the filter does', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('checkbox', { name: 'No Pork' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ diet: ['contains_pork'] }) })
    expect(screen.getByText(/blog posts and your history are hidden/)).toBeInTheDocument()
  })
})

describe('SearchResults paging, empty results and errors', () => {
  it('loads more results after the first 20', async () => {
    const user = userEvent.setup()
    mockSearch.mockResolvedValueOnce(page([encyclopediaResult, communityResult], undefined, 3))
    mockSearch.mockResolvedValueOnce(page([blogResult], undefined, 3))
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Best Reuben Variations')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ offset: 2 })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('suggests rolling a sandwich when nothing matches', async () => {
    mockSearch.mockResolvedValue(page([], { database: 0, community: 0, blog: 0, saved: null }, 0))
    renderAt('/search?q=xylophone')

    expect(await screen.findByText('No sandwiches found for "xylophone". Try a different search or roll a new one!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Roll a sandwich' })).toHaveAttribute('href', '/')
  })

  it('asks people to slow down when they search too quickly', async () => {
    mockSearch.mockRejectedValueOnce(new TooManyRequestsError("You're searching very quickly. Please wait a moment."))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent("You're searching very quickly. Please wait a moment.")
  })

  it('offers to try again when the search fails', async () => {
    const user = userEvent.setup()
    mockSearch.mockRejectedValueOnce(new Error('offline'))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong with that search.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Reuben')).toBeInTheDocument()
  })
})

describe('SearchResults analytics', () => {
  it('records each search with its tab and result count', async () => {
    mockSearch.mockResolvedValue(page([encyclopediaResult], { database: 2, community: 1, blog: 4, saved: null }, 7))
    renderAt('/search?q=reuben&source=blog')
    await screen.findByText('Reuben')

    expect(mockPerformed).toHaveBeenCalledWith({ query: 'reuben', source: 'blog', resultsCount: 7, surface: 'page' })
    expect(mockHasUsedSearch).toHaveBeenCalled()
  })

  it('does not count loading more as a new search', async () => {
    const user = userEvent.setup()
    mockSearch.mockResolvedValueOnce(page([encyclopediaResult], undefined, 2))
    mockSearch.mockResolvedValueOnce(page([blogResult], undefined, 2))
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('Best Reuben Variations')

    expect(mockPerformed).toHaveBeenCalledTimes(1)
  })

  it('records which result was clicked and where it was in the list', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(await screen.findByRole('link', { name: /Reuben Melt/ }))

    expect(mockClicked).toHaveBeenCalledWith({
      query: 'reuben',
      resultSource: 'community',
      slug: 'reuben-melt-abc12345',
      position: 2,
      surface: 'page',
    })
  })
})
