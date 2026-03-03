import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '@/pages/HomePage'

// Total duration for all 5 categories to settle:
// Each category takes CATEGORY_DURATION (640ms), staggered by STAGGER_MS (200ms).
// Last category (index 4) commits at 4 * 840 + 640 = 3999ms → use 4500ms to be safe.
const FULL_ROLL_MS = 4500

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
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
})
