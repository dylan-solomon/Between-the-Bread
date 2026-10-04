import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

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
import SearchOverlay from '@/components/search/SearchOverlay'
import { accessibilityProblems } from '@/test/accessibility'

const results = [
  { source: 'database', slug: 'reuben', title: 'Reuben', details: {} },
  { source: 'community', slug: 'reuben-melt-abc12345', title: 'Reuben Melt', details: {} },
  { source: 'blog', slug: 'best-reubens', title: 'Best Reuben Variations', details: {} },
  { source: 'saved', slug: 'saved-1', title: 'My Reuben', details: {} },
]

const counts = { database: 1, community: 1, blog: 1, saved: 1 }

function ShowLocation() {
  const location = useLocation()
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>
}

const renderOverlay = () => {
  const onClose = vi.fn()
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="*" element={<><SearchOverlay onClose={onClose} /><ShowLocation /></>} />
      </Routes>
    </MemoryRouter>,
  )
  return { onClose }
}

const box = () => screen.getByRole('searchbox', { name: 'Search the site' })

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, session: null, loading: false })
  mockSearch.mockResolvedValue({ items: results, counts, totalCount: 4 })
})

describe('SearchOverlay', () => {
  it('puts the cursor in the search box', () => {
    renderOverlay()

    expect(box()).toHaveFocus()
  })

  it('waits for at least two letters before searching', async () => {
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'r')

    expect(screen.getByText('Type at least 2 letters to search.')).toBeInTheDocument()
    await new Promise((resolve) => { setTimeout(resolve, 350) })
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('shows the top five matches once typing pauses', async () => {
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')

    expect(await screen.findByRole('link', { name: /Reuben Melt/ })).toHaveAttribute('href', '/community/reuben-melt-abc12345')
    expect(mockSearch).toHaveBeenCalledTimes(1)
    expect(mockSearch).toHaveBeenCalledWith({ q: 'reuben', limit: 5, token: undefined })
  })

  it('labels where each match comes from', async () => {
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')

    expect(await screen.findByRole('link', { name: 'Reuben Classic Sandwich' })).toHaveAttribute('href', '/sandwiches/reuben')
    expect(screen.getByRole('link', { name: 'Best Reuben Variations Blog' })).toHaveAttribute('href', '/blog/best-reubens')
    expect(screen.getByRole('link', { name: 'My Reuben My History' })).toHaveAttribute('href', '/account/history?q=My+Reuben')
  })

  it('includes the signed-in person\'s history', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, session: { access_token: 'token-abc' }, loading: false })
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')

    await waitFor(() => { expect(mockSearch).toHaveBeenCalledWith({ q: 'reuben', limit: 5, token: 'token-abc' }) })
  })

  it('keeps keyboard focus inside the search box and its matches', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.type(box(), 'reuben')
    await screen.findByRole('link', { name: /Reuben Melt/ })

    await user.tab({ shift: true })
    expect(screen.getByRole('link', { name: 'See all results for "reuben"' })).toHaveFocus()
    await user.tab()

    expect(box()).toHaveFocus()
  })

  it('closes after a match is picked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()
    await user.type(box(), 'reuben')

    await user.click(await screen.findByRole('link', { name: /Reuben Melt/ }))

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('location')).toHaveTextContent('/community/reuben-melt-abc12345')
  })

  it('links to every result for the search', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()
    await user.type(box(), 'reuben')

    await user.click(await screen.findByRole('link', { name: 'See all results for "reuben"' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=reuben')
    expect(onClose).toHaveBeenCalled()
  })

  it('opens the full results when Enter is pressed', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()

    await user.type(box(), 'cubano{Enter}')

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=cubano')
    expect(onClose).toHaveBeenCalled()
  })

  it('ignores Enter with too few letters', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()

    await user.type(box(), 'c{Enter}')

    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking outside it', async () => {
    const user = userEvent.setup()
    const { onClose } = renderOverlay()

    await user.click(screen.getByTestId('search-backdrop'))

    expect(onClose).toHaveBeenCalled()
  })

  it('says when nothing matches', async () => {
    mockSearch.mockResolvedValue({ items: [], counts: { database: 0, community: 0, blog: 0, saved: null }, totalCount: 0 })
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'xylophone')

    expect(await screen.findByText('No results for "xylophone".')).toBeInTheDocument()
  })

  it('asks people to slow down when they search too quickly', async () => {
    mockSearch.mockRejectedValue(new TooManyRequestsError("You're searching very quickly. Please wait a moment."))
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')

    expect(await screen.findByText("You're searching very quickly. Please wait a moment.")).toBeInTheDocument()
  })

  it('says when search is not working', async () => {
    mockSearch.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')

    expect(await screen.findByText("Search isn't working right now. Please try again.")).toBeInTheDocument()
  })

  it('shows only the answer for the latest words', async () => {
    const answers: ((value: unknown) => void)[] = []
    mockSearch.mockImplementation(() => new Promise((resolve) => { answers.push(resolve) }))
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'ham')
    await waitFor(() => { expect(answers).toHaveLength(1) })
    await user.type(box(), 'burger')
    await waitFor(() => { expect(answers).toHaveLength(2) })

    answers[1]({ items: [{ source: 'database', slug: 'hamburger', title: 'Hamburger', details: {} }], counts, totalCount: 1 })
    answers[0]({ items: [{ source: 'database', slug: 'ham-on-rye', title: 'Ham on Rye', details: {} }], counts, totalCount: 1 })

    expect(await screen.findByText('Hamburger')).toBeInTheDocument()
    expect(screen.queryByText('Ham on Rye')).not.toBeInTheDocument()
  })
})

describe('SearchOverlay analytics', () => {
  it('records each instant search once typing pauses', async () => {
    const user = userEvent.setup()
    renderOverlay()

    await user.type(box(), 'reuben')
    await screen.findByText('Reuben Melt')

    expect(mockPerformed).toHaveBeenCalledTimes(1)
    expect(mockPerformed).toHaveBeenCalledWith({ query: 'reuben', source: 'all', resultsCount: 4, surface: 'header' })
    expect(mockHasUsedSearch).toHaveBeenCalled()
  })

  it('records which match was clicked and where it was in the list', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.type(box(), 'reuben')

    await user.click(await screen.findByRole('link', { name: 'Best Reuben Variations Blog' }))

    expect(mockClicked).toHaveBeenCalledWith({ query: 'reuben', resultSource: 'blog', slug: 'best-reubens', position: 3, surface: 'header' })
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.type(box(), 'reuben')
    await screen.findByText('Reuben Melt')

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
