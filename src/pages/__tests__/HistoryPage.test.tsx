import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import type { SavedSandwich } from '@/api/savedSandwiches'

const {
  mockFetchSavedSandwiches,
  mockUpdateSavedSandwich,
  mockDeleteSavedSandwich,
  mockClearSavedSandwiches,
  mockCaptureHistoryViewed,
  mockCaptureHistorySearched,
  mockCaptureHistorySandwichFavorited,
  mockCaptureHistorySandwichUnfavorited,
  mockCaptureHistorySandwichDeleted,
  mockCaptureHistoryCleared,
  mockCaptureHistorySandwichRated,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockFetchSavedSandwiches: vi.fn(),
  mockUpdateSavedSandwich: vi.fn(),
  mockDeleteSavedSandwich: vi.fn(),
  mockClearSavedSandwiches: vi.fn(),
  mockCaptureHistoryViewed: vi.fn(),
  mockCaptureHistorySearched: vi.fn(),
  mockCaptureHistorySandwichFavorited: vi.fn(),
  mockCaptureHistorySandwichUnfavorited: vi.fn(),
  mockCaptureHistorySandwichDeleted: vi.fn(),
  mockCaptureHistoryCleared: vi.fn(),
  mockCaptureHistorySandwichRated: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-1' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
    },
  },
}))

vi.mock('@/api/savedSandwiches', () => ({
  fetchSavedSandwiches: mockFetchSavedSandwiches,
  updateSavedSandwich: mockUpdateSavedSandwich,
  deleteSavedSandwich: mockDeleteSavedSandwich,
  clearSavedSandwiches: mockClearSavedSandwiches,
}))

vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError }, Toaster: () => null }))

vi.mock('@/analytics/events', () => ({
  captureHistoryViewed: mockCaptureHistoryViewed,
  captureHistorySearched: mockCaptureHistorySearched,
  captureHistorySandwichFavorited: mockCaptureHistorySandwichFavorited,
  captureHistorySandwichUnfavorited: mockCaptureHistorySandwichUnfavorited,
  captureHistorySandwichDeleted: mockCaptureHistorySandwichDeleted,
  captureHistoryCleared: mockCaptureHistoryCleared,
  captureHistorySandwichRated: mockCaptureHistorySandwichRated,
}))

const makeSavedSandwich = (overrides: Partial<SavedSandwich> = {}): SavedSandwich => ({
  id: 'sand-1',
  name: 'Turkey & Swiss on Sourdough',
  composition: { bread: ['sourdough'], protein: ['turkey'], cheese: ['swiss'], toppings: ['lettuce'], condiments: ['mayo'] },
  total_estimated_cost: null,
  total_nutrition: null,
  rating: null,
  is_favorite: false,
  created_at: '2026-03-20T12:00:00Z',
  ...overrides,
})

const makeListResponse = (sandwiches: SavedSandwich[], total?: number) => ({
  data: sandwiches,
  meta: { count: sandwiches.length, total: total ?? sandwiches.length, limit: 10, offset: 0 },
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/account/history']}>
      <AuthProvider>
        <HistoryPage />
      </AuthProvider>
    </MemoryRouter>,
  )

// Lazy import so mocks are in place
let HistoryPage: React.ComponentType
beforeEach(async () => {
  vi.clearAllMocks()
  mockFetchSavedSandwiches.mockResolvedValue(makeListResponse([]))
  const mod = await import('@/pages/HistoryPage')
  HistoryPage = mod.default
})

describe('HistoryPage', () => {
  describe('initial load', () => {
    it('renders a heading', async () => {
      renderPage()
      expect(await screen.findByRole('heading', { name: /saved sandwiches/i })).toBeInTheDocument()
    })

    it('shows a loading state while sandwiches are being fetched', async () => {
      mockFetchSavedSandwiches.mockReturnValue(new Promise(() => undefined))
      renderPage()
      expect(await screen.findByText(/loading/i)).toBeInTheDocument()
    })

    it('fires the history_viewed analytics event on mount', async () => {
      renderPage()
      await waitFor(() => { expect(mockCaptureHistoryViewed).toHaveBeenCalledTimes(1) })
    })

    it('shows empty state when no sandwiches exist', async () => {
      renderPage()
      expect(await screen.findByText(/no saved sandwiches/i)).toBeInTheDocument()
    })

    it('renders the search input', async () => {
      renderPage()
      expect(await screen.findByRole('searchbox')).toBeInTheDocument()
    })

    it('renders the sort dropdown', async () => {
      renderPage()
      expect(await screen.findByRole('combobox', { name: /sort/i })).toBeInTheDocument()
    })
  })

  describe('sandwich list', () => {
    it('displays sandwich names', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([
          makeSavedSandwich({ id: 's1', name: 'The Reuben' }),
          makeSavedSandwich({ id: 's2', name: 'Club Classic' }),
        ]),
      )
      renderPage()
      expect(await screen.findByText('The Reuben')).toBeInTheDocument()
      expect(screen.getByText('Club Classic')).toBeInTheDocument()
    })

    it('displays the created date for each sandwich', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ created_at: '2026-03-20T12:00:00Z' })]),
      )
      renderPage()
      expect(await screen.findByText(/mar.*20.*2026/i)).toBeInTheDocument()
    })

    it('displays star rating for each sandwich', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ rating: 4 })]),
      )
      renderPage()
      const ratingGroup = await screen.findByRole('group', { name: /rating/i })
      const filledStars = within(ratingGroup).getAllByRole('button').filter(
        (btn) => btn.getAttribute('data-filled') === 'true',
      )
      expect(filledStars).toHaveLength(4)
    })

    it('shows a delete button for each sandwich', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich()]),
      )
      renderPage()
      expect(await screen.findByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('shows a favorite toggle for each sandwich', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich()]),
      )
      renderPage()
      expect(await screen.findByRole('button', { name: /favorite/i })).toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('calls the API with the search query after debounce', async () => {
      renderPage()
      const searchBox = await screen.findByRole('searchbox')
      await userEvent.type(searchBox, 'reuben')
      await waitFor(() => {
        expect(mockFetchSavedSandwiches).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({ q: 'reuben' }),
        )
      })
    })

    it('fires the history_searched analytics event', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ name: 'Reuben' })], 1),
      )
      renderPage()
      const searchBox = await screen.findByRole('searchbox')
      await userEvent.type(searchBox, 'reuben')
      await waitFor(() => {
        expect(mockCaptureHistorySearched).toHaveBeenCalledWith(
          expect.objectContaining({ query: 'reuben' }),
        )
      })
    })

    it('shows result count after searching', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich()], 1),
      )
      renderPage()
      const searchBox = await screen.findByRole('searchbox')
      await userEvent.type(searchBox, 'turkey')
      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument()
      })
    })
  })

  describe('filters', () => {
    it('has a favorites-only filter', async () => {
      renderPage()
      expect(await screen.findByRole('checkbox', { name: /favorites/i })).toBeInTheDocument()
    })

    it('calls the API with favorites_only when toggled', async () => {
      renderPage()
      const checkbox = await screen.findByRole('checkbox', { name: /favorites/i })
      await userEvent.click(checkbox)
      await waitFor(() => {
        expect(mockFetchSavedSandwiches).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({ favorites_only: true }),
        )
      })
    })

    it('has a rating filter dropdown', async () => {
      renderPage()
      expect(await screen.findByRole('combobox', { name: /rating/i })).toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('calls the API with the selected sort option', async () => {
      renderPage()
      const sortSelect = await screen.findByRole('combobox', { name: /sort/i })
      await userEvent.selectOptions(sortSelect, 'rating_high')
      await waitFor(() => {
        expect(mockFetchSavedSandwiches).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({ sort: 'rating_high' }),
        )
      })
    })
  })

  describe('actions', () => {
    it('toggles favorite and fires analytics event', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ id: 's1', is_favorite: false })]),
      )
      mockUpdateSavedSandwich.mockResolvedValue({ id: 's1', is_favorite: true, rating: null, updated_at: '' })
      renderPage()
      const favBtn = await screen.findByRole('button', { name: /favorite/i })
      fireEvent.click(favBtn)
      await waitFor(() => {
        expect(mockUpdateSavedSandwich).toHaveBeenCalledWith('test-token', 's1', { is_favorite: true })
      })
      await waitFor(() => {
        expect(mockCaptureHistorySandwichFavorited).toHaveBeenCalled()
      })
    })

    it('unfavorites and fires unfavorited event', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ id: 's1', is_favorite: true })]),
      )
      mockUpdateSavedSandwich.mockResolvedValue({ id: 's1', is_favorite: false, rating: null, updated_at: '' })
      renderPage()
      const favBtn = await screen.findByRole('button', { name: /unfavorite/i })
      fireEvent.click(favBtn)
      await waitFor(() => {
        expect(mockCaptureHistorySandwichUnfavorited).toHaveBeenCalled()
      })
    })

    it('deletes a sandwich and refreshes the list', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ id: 's1' })]),
      )
      mockDeleteSavedSandwich.mockResolvedValue(undefined)
      renderPage()
      const deleteBtn = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        expect(mockDeleteSavedSandwich).toHaveBeenCalledWith('test-token', 's1')
      })
      await waitFor(() => {
        expect(mockCaptureHistorySandwichDeleted).toHaveBeenCalled()
      })
    })

    it('updates rating on a sandwich entry', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ id: 's1', rating: null })]),
      )
      mockUpdateSavedSandwich.mockResolvedValue({ id: 's1', rating: 3, is_favorite: false, updated_at: '' })
      renderPage()
      const ratingGroup = await screen.findByRole('group', { name: /rating/i })
      const thirdStar = within(ratingGroup).getAllByRole('button')[2]
      fireEvent.click(thirdStar)
      await waitFor(() => {
        expect(mockUpdateSavedSandwich).toHaveBeenCalledWith('test-token', 's1', { rating: 3 })
      })
      await waitFor(() => {
        expect(mockCaptureHistorySandwichRated).toHaveBeenCalled()
      })
    })

    it('shows error toast on delete failure', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich({ id: 's1' })]),
      )
      mockDeleteSavedSandwich.mockRejectedValue(new Error('fail'))
      renderPage()
      const deleteBtn = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteBtn)
      await waitFor(() => { expect(mockToastError).toHaveBeenCalled() })
    })
  })

  describe('clear all', () => {
    it('shows a clear all button when sandwiches exist', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich()]),
      )
      renderPage()
      expect(await screen.findByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('calls clearSavedSandwiches on confirm and fires event', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse([makeSavedSandwich()]),
      )
      mockClearSavedSandwiches.mockResolvedValue(1)
      renderPage()
      const clearBtn = await screen.findByRole('button', { name: /clear all/i })
      fireEvent.click(clearBtn)
      const confirmBtn = await screen.findByRole('button', { name: /confirm/i })
      fireEvent.click(confirmBtn)
      await waitFor(() => {
        expect(mockClearSavedSandwiches).toHaveBeenCalledWith('test-token', false)
      })
      await waitFor(() => {
        expect(mockCaptureHistoryCleared).toHaveBeenCalled()
      })
    })
  })

  describe('pagination', () => {
    it('shows pagination controls when there are more results than the page size', async () => {
      mockFetchSavedSandwiches.mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => makeSavedSandwich({ id: `s${String(i)}` })),
        meta: { count: 10, total: 25, limit: 10, offset: 0 },
      })
      renderPage()
      expect(await screen.findByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('fetches the next page when Next is clicked', async () => {
      mockFetchSavedSandwiches.mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => makeSavedSandwich({ id: `s${String(i)}` })),
        meta: { count: 10, total: 25, limit: 10, offset: 0 },
      })
      renderPage()
      const nextBtn = await screen.findByRole('button', { name: /next/i })
      fireEvent.click(nextBtn)
      await waitFor(() => {
        expect(mockFetchSavedSandwiches).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({ offset: 10 }),
        )
      })
    })
  })

  describe('limit warning', () => {
    it('shows a warning when user has 45+ sandwiches', async () => {
      mockFetchSavedSandwiches.mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => makeSavedSandwich({ id: `s${String(i)}` })),
        meta: { count: 10, total: 46, limit: 10, offset: 0 },
      })
      renderPage()
      expect(await screen.findByText(/approaching.*50.*limit/i)).toBeInTheDocument()
    })

    it('shows a full warning when user has 50 sandwiches', async () => {
      mockFetchSavedSandwiches.mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => makeSavedSandwich({ id: `s${String(i)}` })),
        meta: { count: 10, total: 50, limit: 10, offset: 0 },
      })
      renderPage()
      expect(await screen.findByText(/history full/i)).toBeInTheDocument()
    })

    it('does not show a warning when under 45 sandwiches', async () => {
      mockFetchSavedSandwiches.mockResolvedValue(
        makeListResponse(
          Array.from({ length: 10 }, (_, i) => makeSavedSandwich({ id: `s${String(i)}` })),
          44,
        ),
      )
      renderPage()
      await screen.findByRole('heading', { name: /saved sandwiches/i })
      expect(screen.queryByText(/approaching.*limit/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/history full/i)).not.toBeInTheDocument()
    })
  })
})
