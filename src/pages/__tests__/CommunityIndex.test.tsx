import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { makeCategories, makeIngredient } from '@/test/factories'
import { clearSentData, sendWithPage } from '@/test/initialData'

const { mockFetchLeaderboard, mockUseIngredients, mockViewed, mockSorted, mockFiltered, mockPreferredSort } = vi.hoisted(() => ({
  mockPreferredSort: vi.fn(),
  mockViewed: vi.fn(),
  mockSorted: vi.fn(),
  mockFiltered: vi.fn(),
  mockFetchLeaderboard: vi.fn(),
  mockUseIngredients: vi.fn(),
}))

vi.mock('@/api/community', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/community')>()),
  fetchCommunityLeaderboard: mockFetchLeaderboard,
}))
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))
vi.mock('@/analytics/userProperties', () => ({ setPreferredSortMode: mockPreferredSort }))
vi.mock('@/analytics/events', () => ({
  captureCommunityViewed: mockViewed,
  captureCommunitySorted: mockSorted,
  captureCommunityFiltered: mockFiltered,
}))

import CommunityIndex from '@/pages/CommunityIndex'

const makeSandwich = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  slug: 'turkey-swiss-on-rye-abc12345',
  name: 'Turkey & Swiss on Rye',
  fun_name: null,
  composition: { bread: [{ slug: 'rye', name: 'Rye' }], protein: [{ slug: 'turkey', name: 'Turkey' }] },
  dietary_tags: [],
  generated_count: 47,
  avg_rating: 4.5,
  rating_count: 12,
  created_at: '2026-10-01T12:00:00Z',
  rank: 1,
  ...overrides,
})

const ranked = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeSandwich({ id: `c-${String(index + 1)}`, slug: `sandwich-${String(index + 1)}`, name: `Sandwich ${String(index + 1)}`, rank: index + 1 }),
  )

function ShowSearch() {
  return <p data-testid="search">{useLocation().search}</p>
}

const renderAt = (url = '/community') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <CommunityIndex />
        <ShowSearch />
      </MemoryRouter>
    </HelmetProvider>,
  )

const lastQuery = (): Record<string, unknown> =>
  (mockFetchLeaderboard.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchLeaderboard.mockResolvedValue({ items: [makeSandwich()], totalCount: 1 })
  mockUseIngredients.mockReturnValue({
    categories: makeCategories(),
    pools: {
      bread: [makeIngredient({ name: 'Rye', slug: 'rye' })],
      protein: [makeIngredient({ name: 'Ham', slug: 'ham' }), makeIngredient({ name: 'Turkey', slug: 'turkey' })],
    },
    lookupPools: {},
    loading: false,
    error: null,
  })
})

describe('CommunityIndex', () => {
  it('shows a loading state while fetching', () => {
    mockFetchLeaderboard.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status', { name: 'Loading sandwiches' })).toBeInTheDocument()
  })

  it('has a heading and an introduction', async () => {
    renderAt()

    expect(await screen.findByRole('heading', { level: 1, name: 'Community Leaderboard' })).toBeInTheDocument()
    expect(screen.getByText(/made most on Between the Bread/)).toBeInTheDocument()
  })

  it('asks for the 24 most popular sandwiches to start with', async () => {
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    expect(lastQuery()).toEqual({ sort: 'most_popular', diet: [], ingredient: undefined, limit: 24, offset: 0 })
  })

  it('shows each sandwich as a card linking to its page', async () => {
    renderAt()

    const link = await screen.findByRole('link', { name: /Turkey & Swiss on Rye/ })
    expect(link).toHaveAttribute('href', '/community/turkey-swiss-on-rye-abc12345')
    expect(within(link).getByText('Made 47 times')).toBeInTheDocument()
    expect(within(link).getByText('★ 4.5 (12)')).toBeInTheDocument()
    expect(within(link).getAllByLabelText('Rye')).toHaveLength(2)
  })

  it('describes a sandwich made once and one with no ratings', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      items: [makeSandwich({ generated_count: 1, avg_rating: null, rating_count: 0 })],
      totalCount: 1,
    })
    renderAt()

    expect(await screen.findByText('Made once')).toBeInTheDocument()
    expect(screen.getByText('Not yet rated')).toBeInTheDocument()
  })

  it('shows the fun name under the sandwich name when there is one', async () => {
    mockFetchLeaderboard.mockResolvedValue({ items: [makeSandwich({ fun_name: 'The Rye Guy' })], totalCount: 1 })
    renderAt()

    expect(await screen.findByText('The Rye Guy')).toBeInTheDocument()
  })

  it('shows dietary badges', async () => {
    mockFetchLeaderboard.mockResolvedValue({
      items: [makeSandwich({ dietary_tags: ['dairy_free', 'contains_pork', 'not_a_tag'] })],
      totalCount: 1,
    })
    renderAt()

    expect(await screen.findByText('Dairy-Free')).toBeInTheDocument()
    expect(screen.getByText('Contains Pork')).toBeInTheDocument()
    expect(screen.queryByText('not_a_tag')).not.toBeInTheDocument()
  })

  it('gives the top three their medal and numbers the rest', async () => {
    mockFetchLeaderboard.mockResolvedValue({ items: ranked(4), totalCount: 4 })
    renderAt()
    await screen.findByText('Sandwich 1')

    expect(screen.getByLabelText('1st place')).toHaveTextContent('#1')
    expect(screen.getByLabelText('2nd place')).toHaveTextContent('#2')
    expect(screen.getByLabelText('3rd place')).toHaveTextContent('#3')
    expect(screen.getByLabelText('Ranked 4')).toHaveTextContent('#4')
  })

  it('titles and describes the page for search engines', async () => {
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await waitFor(() => {
      expect(document.title).toBe('Community Leaderboard | Between the Bread')
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', expect.stringContaining('community'))
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://betweenbread.co/community')
    })
  })
})

describe('CommunityIndex sorting', () => {
  it('offers the four ways to rank sandwiches, starting with most popular', async () => {
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    const group = screen.getByRole('group', { name: 'Sort by' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Top Rated',
      'Most Popular',
      'Trending',
      'Newest',
    ])
    expect(within(group).getByRole('button', { name: 'Most Popular' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('re-ranks when another sort is picked and remembers it in the address', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await user.click(screen.getByRole('button', { name: 'Top Rated' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ sort: 'top_rated', offset: 0 }) })
    expect(screen.getByRole('button', { name: 'Top Rated' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('search')).toHaveTextContent('?sort=top_rated')
  })

  it('starts from the sort in the address', async () => {
    renderAt('/community?sort=trending')
    await screen.findByText('Turkey & Swiss on Rye')

    expect(lastQuery()).toMatchObject({ sort: 'trending' })
  })

  it('ignores an unknown sort in the address', async () => {
    renderAt('/community?sort=loudest')
    await screen.findByText('Turkey & Swiss on Rye')

    expect(lastQuery()).toMatchObject({ sort: 'most_popular' })
  })
})

describe('CommunityIndex filters', () => {
  it('filters by diet', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await user.click(screen.getByRole('checkbox', { name: 'No Pork' }))
    await user.click(screen.getByRole('checkbox', { name: 'Vegetarian' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ diet: ['contains_pork', 'vegetarian'] }) })
    expect(screen.getByText(/always check labels/)).toBeInTheDocument()
  })

  it('filters by an ingredient', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await user.selectOptions(screen.getByLabelText('Ingredient'), 'ham')

    await waitFor(() => { expect(lastQuery()).toMatchObject({ ingredient: 'ham' }) })
    expect(screen.getByTestId('search')).toHaveTextContent('ingredient=ham')
  })

  it('says when nothing matches the filters and offers to clear them', async () => {
    const user = userEvent.setup()
    mockFetchLeaderboard.mockResolvedValue({ items: [], totalCount: 0 })
    renderAt('/community?diet=vegan')

    expect(await screen.findByText('No community sandwiches match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ diet: [] }) })
  })

  it('invites people to start the leaderboard when it is empty', async () => {
    mockFetchLeaderboard.mockResolvedValue({ items: [], totalCount: 0 })
    renderAt()

    expect(await screen.findByText(/No community sandwiches yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Build a sandwich' })).toHaveAttribute('href', '/')
  })
})

describe('CommunityIndex paging and errors', () => {
  it('loads more sandwiches after the first 24', async () => {
    const user = userEvent.setup()
    mockFetchLeaderboard.mockResolvedValueOnce({ items: ranked(2), totalCount: 3 })
    mockFetchLeaderboard.mockResolvedValueOnce({ items: [makeSandwich({ id: 'c-3', slug: 'sandwich-3', name: 'Sandwich 3', rank: 3 })], totalCount: 3 })
    renderAt()
    await screen.findByText('Sandwich 1')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Sandwich 3')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ offset: 2 })
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('offers to try again when the leaderboard cannot be loaded', async () => {
    const user = userEvent.setup()
    mockFetchLeaderboard.mockRejectedValueOnce(new Error('offline'))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading the leaderboard.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Turkey & Swiss on Rye')).toBeInTheDocument()
  })
})

describe('CommunityIndex sent with the page', () => {
  afterEach(clearSentData)

  it('shows the leaderboard straight away without asking the server again', () => {
    sendWithPage('/community', { items: ranked(2), totalCount: 30 })

    renderAt()

    expect(screen.getByRole('link', { name: /Sandwich 1/ })).toHaveAttribute('href', '/community/sandwich-1')
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    expect(mockFetchLeaderboard).not.toHaveBeenCalled()
  })

  it('loads the leaderboard when the address has a sort or filter', async () => {
    sendWithPage('/community', { items: ranked(2), totalCount: 30 })

    renderAt('/community?sort=newest')

    await screen.findByText('Turkey & Swiss on Rye')
    expect(lastQuery()).toMatchObject({ sort: 'newest' })
  })

  it('loads the leaderboard when the content sent is incomplete', async () => {
    sendWithPage('/community', { items: ranked(2) })

    renderAt()

    await screen.findByText('Turkey & Swiss on Rye')
    expect(mockFetchLeaderboard).toHaveBeenCalled()
  })
})

describe('CommunityIndex analytics', () => {
  it('records that the leaderboard was viewed, once', async () => {
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    expect(mockViewed).toHaveBeenCalledTimes(1)
  })

  it('records a change of sort', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await user.click(screen.getByRole('button', { name: 'Trending' }))

    expect(mockSorted).toHaveBeenCalledWith({ sort: 'trending' })
    expect(mockPreferredSort).toHaveBeenCalledWith('trending')
  })

  it('does not record picking the sort that is already chosen', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Turkey & Swiss on Rye')

    await user.click(screen.getByRole('button', { name: 'Most Popular' }))

    expect(mockSorted).not.toHaveBeenCalled()
  })

  it('records filter changes with the resulting filters', async () => {
    const user = userEvent.setup()
    renderAt('/community?sort=top_rated')
    await screen.findByText('Turkey & Swiss on Rye')

    await user.click(screen.getByRole('checkbox', { name: 'Vegan' }))
    await user.selectOptions(screen.getByLabelText('Ingredient'), 'ham')

    expect(mockFiltered).toHaveBeenNthCalledWith(1, { diet: ['vegan'], ingredient: null, sort: 'top_rated' })
    expect(mockFiltered).toHaveBeenNthCalledWith(2, { diet: ['vegan'], ingredient: 'ham', sort: 'top_rated' })
  })
})
