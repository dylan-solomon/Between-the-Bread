import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { toast } from 'sonner'

const { mockFetchSandwiches, mockViewed, mockSearched, mockFiltered } = vi.hoisted(() => ({
  mockFetchSandwiches: vi.fn(),
  mockViewed: vi.fn(),
  mockSearched: vi.fn(),
  mockFiltered: vi.fn(),
}))

vi.mock('@/api/database', () => ({ fetchSandwiches: mockFetchSandwiches }))
vi.mock('@/analytics/events', () => ({
  captureEncyclopediaViewed: mockViewed,
  captureEncyclopediaSearched: mockSearched,
  captureEncyclopediaFiltered: mockFiltered,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import SandwichIndex from '@/pages/SandwichIndex'

const makeSandwich = (overrides: Record<string, unknown> = {}) => ({
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef and sauerkraut on rye.',
  origin_country: 'United States',
  origin_region: 'Americas',
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
  dietary_tags: [],
  alternative_names: [],
  canonical_ingredients: {},
  ...overrides,
})

const banhMi = makeSandwich({ name: 'Banh Mi', slug: 'banh-mi', origin_country: 'Vietnam', origin_region: 'Asia', avg_rating: null, rating_count: 0 })

const renderAt = (url = '/sandwiches') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <SandwichIndex />
      </MemoryRouter>
    </HelmetProvider>,
  )

const lastQuery = (): Record<string, unknown> =>
  (mockFetchSandwiches.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchSandwiches.mockResolvedValue({ items: [makeSandwich(), banhMi], totalCount: 2 })
})

describe('SandwichIndex results', () => {
  it('shows a loading state while fetching', () => {
    mockFetchSandwiches.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('asks for the first page of 24 entries', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(lastQuery()).toMatchObject({ limit: 24, offset: 0 })
  })

  it('shows each sandwich as a card linking to its page', async () => {
    renderAt()

    const link = await screen.findByRole('link', { name: /Reuben/ })
    expect(link).toHaveAttribute('href', '/sandwiches/reuben')
    expect(link).toHaveTextContent('United States')
    expect(link).toHaveTextContent('Corned beef and sauerkraut on rye.')
    expect(link).toHaveTextContent('4.5')
    expect(link).toHaveTextContent('12')
  })

  it('shows the other names on a card so a match on an alias makes sense', async () => {
    mockFetchSandwiches.mockResolvedValue({
      items: [makeSandwich({ name: 'Grilled Cheese', slug: 'grilled-cheese', alternative_names: ['Cheese toastie', 'Cheese jaffle'] })],
      totalCount: 1,
    })
    renderAt('/sandwiches?q=toastie')

    expect(await screen.findByRole('link', { name: /Grilled Cheese/ })).toHaveTextContent('Also known as: Cheese toastie, Cheese jaffle')
  })

  it('leaves out the other names line on cards without any', async () => {
    renderAt()

    expect(await screen.findByRole('link', { name: /Reuben/ })).not.toHaveTextContent('Also known as')
  })

  it('shows unrated sandwiches as not yet rated', async () => {
    renderAt()

    expect(await screen.findByRole('link', { name: /Banh Mi/ })).toHaveTextContent('Not yet rated')
  })

  it('shows a card image when there is one', async () => {
    mockFetchSandwiches.mockResolvedValue({
      items: [makeSandwich({ image_url: 'https://example.com/reuben.jpg' })],
      totalCount: 1,
    })
    renderAt()

    expect(await screen.findByRole('img', { name: 'Reuben' })).toHaveAttribute('src', 'https://example.com/reuben.jpg')
  })

  it('shows how many sandwiches were found', async () => {
    mockFetchSandwiches.mockResolvedValue({ items: [makeSandwich()], totalCount: 57 })
    renderAt()

    expect(await screen.findByText('57 sandwiches')).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    mockFetchSandwiches.mockResolvedValue({ items: [], totalCount: 0 })
    renderAt()

    expect(await screen.findByText('No sandwiches match your search.')).toBeInTheDocument()
  })

  it('shows an error with a retry button when loading fails', async () => {
    mockFetchSandwiches.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Reuben')).toBeInTheDocument()
  })
})

describe('SandwichIndex pagination', () => {
  it('loads the next page and appends it', async () => {
    mockFetchSandwiches
      .mockResolvedValueOnce({ items: [makeSandwich()], totalCount: 2 })
      .mockResolvedValueOnce({ items: [banhMi], totalCount: 2 })
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Banh Mi')).toBeInTheDocument()
    expect(screen.getByText('Reuben')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ offset: 1 })
  })

  it('hides Load more once everything is loaded', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('keeps the loaded sandwiches and tells the user when loading more fails', async () => {
    mockFetchSandwiches
      .mockResolvedValueOnce({ items: [makeSandwich()], totalCount: 2 })
      .mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to load more sandwiches.') })
    expect(screen.getByText('Reuben')).toBeInTheDocument()
  })
})

describe('SandwichIndex search and filters', () => {
  it('searches when the form is submitted', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'ham')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ q: 'ham', offset: 0 }) })
  })

  it('replaces the results with the new search results', async () => {
    mockFetchSandwiches
      .mockResolvedValueOnce({ items: [makeSandwich()], totalCount: 1 })
      .mockResolvedValueOnce({ items: [banhMi], totalCount: 1 })
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'banh{Enter}')

    expect(await screen.findByText('Banh Mi')).toBeInTheDocument()
    expect(screen.queryByText('Reuben')).not.toBeInTheDocument()
  })

  it('starts from the search, region, sort and diet in the url', async () => {
    renderAt('/sandwiches?q=ham&region=Europe&sort=rating&diet=vegan,gluten_free')
    await screen.findByText('Reuben')

    expect(lastQuery()).toMatchObject({ q: 'ham', region: 'Europe', sort: 'rating', diet: ['vegan', 'gluten_free'] })
    expect(screen.getByRole('searchbox', { name: 'Search sandwiches' })).toHaveValue('ham')
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('Europe')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('rating')
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toBeChecked()
  })

  it('ignores unknown regions and sorts in the url', async () => {
    renderAt('/sandwiches?region=Atlantis&sort=random')
    await screen.findByText('Reuben')

    expect(lastQuery().region).toBeUndefined()
    expect(lastQuery().sort).toBeUndefined()
  })

  it('filters by region', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Region' }), 'Asia')

    await waitFor(() => { expect(lastQuery()).toMatchObject({ region: 'Asia', offset: 0 }) })
  })

  it('sorts by rating', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'rating')

    await waitFor(() => { expect(lastQuery()).toMatchObject({ sort: 'rating' }) })
  })

  it('filters by dietary tags', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('checkbox', { name: 'Vegan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Gluten-Free' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ diet: ['vegan', 'gluten_free'] }) })
  })

  it('filters out entries containing an avoided ingredient', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('checkbox', { name: 'No Pork' }))

    await waitFor(() => { expect(lastQuery()).toMatchObject({ diet: ['contains_pork'] }) })
  })

  it('offers all eight dietary filters', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual([
      'Vegan',
      'Vegetarian',
      'Pescatarian',
      'Dairy-Free',
      'Gluten-Free',
      'No Pork',
      'No Shellfish',
      'No Peanuts',
    ])
  })

  it('reminds users that tags do not cover brand variation or cross-contamination', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(screen.getByText(/cross-contamination/i)).toBeInTheDocument()
  })

  it('clears filters from the empty state', async () => {
    mockFetchSandwiches.mockResolvedValueOnce({ items: [], totalCount: 0 })
    const user = userEvent.setup()
    renderAt('/sandwiches?region=Europe')
    await screen.findByText('No sandwiches match your search.')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('Reuben')).toBeInTheDocument()
    expect(lastQuery().region).toBeUndefined()
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('')
  })
})

describe('SandwichIndex analytics', () => {
  it('records one index view per visit', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Region' }), 'Asia')
    await screen.findByText('Reuben')

    expect(mockViewed).toHaveBeenCalledTimes(1)
  })

  it('records a search with its query and result count', async () => {
    mockFetchSandwiches.mockResolvedValue({ items: [makeSandwich()], totalCount: 4 })
    renderAt('/sandwiches?q=ham')
    await screen.findByText('Reuben')

    expect(mockSearched).toHaveBeenCalledWith({ query: 'ham', resultsCount: 4 })
  })

  it('does not record a search when there is no query', async () => {
    renderAt()
    await screen.findByText('Reuben')

    expect(mockSearched).not.toHaveBeenCalled()
  })

  it('does not record a search again when loading more results', async () => {
    mockFetchSandwiches
      .mockResolvedValueOnce({ items: [makeSandwich()], totalCount: 2 })
      .mockResolvedValueOnce({ items: [banhMi], totalCount: 2 })
    const user = userEvent.setup()
    renderAt('/sandwiches?q=ham')
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('button', { name: 'Load more' }))
    await screen.findByText('Banh Mi')

    expect(mockSearched).toHaveBeenCalledTimes(1)
  })

  it('records region changes with the resulting filter values', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Region' }), 'Asia')

    expect(mockFiltered).toHaveBeenCalledWith({ region: 'Asia', diet: [], sort: 'name' })
  })

  it('records dietary changes with the resulting filter values', async () => {
    const user = userEvent.setup()
    renderAt('/sandwiches?region=Europe')
    await screen.findByText('Reuben')

    await user.click(screen.getByRole('checkbox', { name: 'Vegan' }))

    expect(mockFiltered).toHaveBeenCalledWith({ region: 'Europe', diet: ['vegan'], sort: 'name' })
  })

  it('records sort changes with the resulting filter values', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Reuben')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'rating')

    expect(mockFiltered).toHaveBeenCalledWith({ region: null, diet: [], sort: 'rating' })
  })

  it('does not record filters that were already in the url when the page opened', async () => {
    renderAt('/sandwiches?region=Europe&sort=rating')
    await screen.findByText('Reuben')

    expect(mockFiltered).not.toHaveBeenCalled()
  })
})
