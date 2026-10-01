import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AuthPromptProvider } from '@/context/AuthPromptContext'
import HomePage from '@/pages/HomePage'
import { makeCategories, makeIngredient, makePool } from '@/test/factories'
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

vi.mock('@/hooks/useIngredients', () => {
  let cached: unknown
  const build = () => {
    const pools = {
      bread: makePool(5),
      protein: makePool(5),
      cheese: makePool(5),
      toppings: makePool(10),
      condiments: makePool(5),
      'chefs-special': makePool(3),
    }
    const hiddenBread = makeIngredient({ name: 'Pain de mie', slug: 'pain-de-mie', enabled: false })
    const lookupPools = { ...pools, bread: [...pools.bread, hiddenBread] }
    return { pools, lookupPools, categories: makeCategories(), loading: false, error: null }
  }
  return {
    useIngredients: () => {
      cached ??= build()
      return cached
    },
  }
})

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

    describe('with an ingredient that is not enabled', () => {
      const loadHiddenBread = () => {
        sessionStorage.setItem('btb_load_sandwich', JSON.stringify({
          composition: {
            bread: [{ slug: 'pain-de-mie', name: 'Pain de mie' }],
            protein: [{ slug: 'item-0', name: 'item-0' }],
            cheese: [{ slug: 'item-0', name: 'item-0' }],
            toppings: [{ slug: 'item-0', name: 'item-0' }],
            condiments: [{ slug: 'item-0', name: 'item-0' }],
          },
        }))
      }

      it('still loads the sandwich and shows the ingredient', () => {
        loadHiddenBread()
        renderPage()

        expect(screen.getAllByText('Pain de mie').length).toBeGreaterThan(0)
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      })

      it('drops the ingredient when the category is rolled again without a lock', () => {
        vi.useFakeTimers()
        loadHiddenBread()
        renderPage()

        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /roll (again|the dice)/i }))
          vi.advanceTimersByTime(FULL_ROLL_MS)
        })

        expect(screen.queryByText('Pain de mie')).not.toBeInTheDocument()
      })

      it('keeps the ingredient through a re-roll when its category is locked', () => {
        vi.useFakeTimers()
        loadHiddenBread()
        renderPage()

        act(() => {
          fireEvent.click(screen.getAllByRole('button', { name: /lock category/i })[0])
        })
        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /roll (again|the dice)/i }))
          vi.advanceTimersByTime(FULL_ROLL_MS)
        })

        expect(screen.getAllByText('Pain de mie').length).toBeGreaterThan(0)
      })

      it('drops a kept ingredient once its category is unlocked and rolled', () => {
        vi.useFakeTimers()
        loadHiddenBread()
        renderPage()

        act(() => {
          fireEvent.click(screen.getAllByRole('button', { name: /lock category/i })[0])
        })
        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /roll (again|the dice)/i }))
          vi.advanceTimersByTime(FULL_ROLL_MS)
        })
        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /unlock category/i }))
        })
        act(() => {
          fireEvent.click(screen.getByRole('button', { name: /roll again/i }))
          vi.advanceTimersByTime(FULL_ROLL_MS)
        })

        expect(screen.queryByText('Pain de mie')).not.toBeInTheDocument()
      })
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

    it('restores savedId and rating when loaded from a saved sandwich', async () => {
      const storedData = {
        composition: {
          bread: [{ slug: 'item-0', name: 'item-0' }],
          protein: [{ slug: 'item-0', name: 'item-0' }],
          cheese: [{ slug: 'item-0', name: 'item-0' }],
          toppings: [{ slug: 'item-0', name: 'item-0' }],
          condiments: [{ slug: 'item-0', name: 'item-0' }],
        },
        savedId: 'saved-123',
        rating: 4,
      }
      sessionStorage.setItem('btb_load_sandwich', JSON.stringify(storedData))
      renderPage()
      const saveButton = await screen.findByRole('button', { name: /saved/i })
      expect(saveButton).toBeDisabled()
    })
  })
})
