import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AuthPromptProvider } from '@/context/AuthPromptContext'
import HomePage from '@/pages/HomePage'
import { makeCategories, makePool } from '@/test/factories'
import type { CompatMatrixRow } from '@/types'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
    },
  },
}))

vi.mock('@/hooks/useIngredients', () => ({
  useIngredients: () => ({
    pools: {
      bread: makePool(5),
      protein: makePool(5),
      cheese: makePool(5),
      toppings: makePool(10),
      condiments: makePool(5),
      'chefs-special': makePool(3),
    },
    categories: makeCategories(),
    loading: false,
    error: null,
  }),
}))

const stubMatrix: CompatMatrixRow[] = [
  { group_a: 'italian', group_b: 'mediterranean', affinity: 0.85 },
]

vi.mock('@/hooks/useCompatMatrix', () => ({
  useCompatMatrix: () => ({ matrix: stubMatrix, loading: false }),
}))

// Total duration for all 5 categories to settle:
// Each category takes CATEGORY_DURATION (640ms), staggered by STAGGER_MS (200ms).
// Last category (index 4) commits at 4 * 840 + 640 = 3999ms → use 4500ms to be safe.
const FULL_ROLL_MS = 4500

vi.mock('@/components/AuthPromptModal', () => ({
  default: () => null,
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPromptProvider>
          <HomePage />
        </AuthPromptProvider>
      </AuthProvider>
    </MemoryRouter>,
  )

describe('HomePage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial render', () => {
    it('renders within the app shell (header and footer present)', () => {
      renderPage()
      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('shows the Roll the Dice button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /roll the dice/i })).toBeInTheDocument()
    })

    it('shows the empty sandwich visual prompt', () => {
      renderPage()
      expect(screen.getByText(/roll the dice to build your sandwich/i)).toBeInTheDocument()
    })

    it('renders a row for each base category', () => {
      renderPage()
      expect(screen.getByText('Bread')).toBeInTheDocument()
      expect(screen.getByText('Protein')).toBeInTheDocument()
      expect(screen.getByText('Cheese')).toBeInTheDocument()
      expect(screen.getByText('Toppings')).toBeInTheDocument()
      expect(screen.getByText('Condiments')).toBeInTheDocument()
    })

    it('lock buttons are disabled before first roll', () => {
      renderPage()
      const lockButtons = screen.getAllByRole('button', { name: /lock category/i })
      lockButtons.forEach((btn) => { expect(btn).toBeDisabled() })
    })
  })

  describe('after rolling', () => {
    it('does not show the summary card while the roll is in progress', () => {
      vi.useFakeTimers()
      renderPage()
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /roll the dice/i }))
        vi.advanceTimersByTime(640) // only bread has settled
      })
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    })

    it('changes button label to "Roll Again" after a full roll', () => {
      vi.useFakeTimers()
      renderPage()
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /roll the dice/i }))
        vi.advanceTimersByTime(FULL_ROLL_MS)
      })
      expect(screen.getByRole('button', { name: /roll again/i })).toBeInTheDocument()
    })

    it('shows a sandwich name heading after a full roll', () => {
      vi.useFakeTimers()
      renderPage()
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /roll the dice/i }))
        vi.advanceTimersByTime(FULL_ROLL_MS)
      })
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('enables lock buttons after first roll', () => {
      vi.useFakeTimers()
      renderPage()
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /roll the dice/i }))
        vi.advanceTimersByTime(FULL_ROLL_MS)
      })
      const lockButtons = screen.getAllByRole('button', { name: /lock category/i })
      expect(lockButtons.some((btn) => !btn.hasAttribute('disabled'))).toBe(true)
    })

    it('hides the empty state prompt after a full roll', () => {
      vi.useFakeTimers()
      renderPage()
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /roll the dice/i }))
        vi.advanceTimersByTime(FULL_ROLL_MS)
      })
      expect(screen.queryByText(/roll the dice to build your sandwich/i)).not.toBeInTheDocument()
    })
  })

  describe('smart mode toggle', () => {
    it('renders the Smart Mode toggle switch', () => {
      renderPage()
      expect(screen.getByRole('switch', { name: /smart mode/i })).toBeInTheDocument()
    })

    it('Smart Mode toggle starts inactive (aria-checked=false)', () => {
      renderPage()
      expect(screen.getByRole('switch', { name: /smart mode/i })).toHaveAttribute('aria-checked', 'false')
    })

    it('Smart Mode toggle becomes active after clicking', async () => {
      renderPage()
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      expect(screen.getByRole('switch', { name: /smart mode/i })).toHaveAttribute('aria-checked', 'true')
    })

    it('Smart Mode toggle deactivates on second click', async () => {
      renderPage()
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      expect(screen.getByRole('switch', { name: /smart mode/i })).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('load from saved sandwich', () => {
    it('loads a saved sandwich from sessionStorage and shows summary card', async () => {
      const storedComposition = {
        composition: {
          bread: [{ slug: 'item-0', name: 'item-0' }],
          protein: [{ slug: 'item-0', name: 'item-0' }],
          cheese: [{ slug: 'item-0', name: 'item-0' }],
          toppings: [{ slug: 'item-0', name: 'item-0' }],
          condiments: [{ slug: 'item-0', name: 'item-0' }],
        },
      }
      sessionStorage.setItem('btb_load_sandwich', JSON.stringify(storedComposition))
      renderPage()
      // Should show the sandwich name heading (from SummaryCard)
      expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('clears sessionStorage after loading', () => {
      const storedComposition = {
        composition: {
          bread: [{ slug: 'item-0', name: 'item-0' }],
          protein: [{ slug: 'item-0', name: 'item-0' }],
          cheese: [{ slug: 'item-0', name: 'item-0' }],
          toppings: [{ slug: 'item-0', name: 'item-0' }],
          condiments: [{ slug: 'item-0', name: 'item-0' }],
        },
      }
      sessionStorage.setItem('btb_load_sandwich', JSON.stringify(storedComposition))
      renderPage()
      expect(sessionStorage.getItem('btb_load_sandwich')).toBeNull()
    })

    it('hides empty state prompt when loaded from history', async () => {
      const storedComposition = {
        composition: {
          bread: [{ slug: 'item-0', name: 'item-0' }],
          protein: [{ slug: 'item-0', name: 'item-0' }],
          cheese: [{ slug: 'item-0', name: 'item-0' }],
          toppings: [{ slug: 'item-0', name: 'item-0' }],
          condiments: [{ slug: 'item-0', name: 'item-0' }],
        },
      }
      sessionStorage.setItem('btb_load_sandwich', JSON.stringify(storedComposition))
      renderPage()
      await screen.findByRole('heading', { level: 2 })
      expect(screen.queryByText(/roll the dice to build your sandwich/i)).not.toBeInTheDocument()
    })
  })
})
