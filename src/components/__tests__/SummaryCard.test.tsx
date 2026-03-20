import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SummaryCard from '@/components/SummaryCard'
import { makeComposition, makeIngredient } from '@/test/factories'

const { mockCreateShare, mockToastSuccess, mockToastError, mockCaptureCostContextToggled } = vi.hoisted(() => ({
  mockCreateShare: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockCaptureCostContextToggled: vi.fn(),
}))

vi.mock('@/api/shareApi', () => ({ createShare: mockCreateShare }))
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError }, Toaster: () => null }))
vi.mock('@/analytics/events', () => ({
  captureShareLinkCreated: vi.fn(),
  captureShareLinkCopied: vi.fn(),
  captureCostContextToggled: mockCaptureCostContextToggled,
  captureNutritionPanelExpanded: vi.fn(),
  captureNutritionPanelCollapsed: vi.fn(),
}))

let mockWriteText: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockCreateShare.mockReset()
  mockToastSuccess.mockReset()
  mockToastError.mockReset()
  mockWriteText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText: mockWriteText } })
})

describe('SummaryCard', () => {
  describe('empty state (no composition)', () => {
    it('renders nothing when composition is null', () => {
      const { container } = render(<SummaryCard composition={null} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('with a composition', () => {
    it('displays the sandwich name as a heading', () => {
      render(<SummaryCard composition={makeComposition()} />)
      expect(screen.getByRole('heading', { name: /turkey & swiss on sourdough/i })).toBeInTheDocument()
    })

    it('omits cheese from name when no-cheese is selected', () => {
      const composition = makeComposition({
        cheese: [makeIngredient({ name: 'No Cheese', slug: 'no-cheese' })],
      })
      render(<SummaryCard composition={composition} />)
      expect(screen.getByRole('heading', { name: /turkey on sourdough/i })).toBeInTheDocument()
    })

    it('shows all ingredient names in the description', () => {
      render(<SummaryCard composition={makeComposition()} />)
      const description = screen.getByTestId('sandwich-description')
      expect(description).toHaveTextContent('Turkey')
      expect(description).toHaveTextContent('Swiss')
      expect(description).toHaveTextContent('Sourdough')
      expect(description).toHaveTextContent('Lettuce')
      expect(description).toHaveTextContent('Mayo')
    })

    it('shows both proteins when doubled', () => {
      const composition = makeComposition({
        protein: [
          makeIngredient({ name: 'Pastrami', slug: 'pastrami' }),
          makeIngredient({ name: 'Salami', slug: 'salami' }),
        ],
      })
      render(<SummaryCard composition={composition} />)
      const description = screen.getByTestId('sandwich-description')
      expect(description).toHaveTextContent('Pastrami')
      expect(description).toHaveTextContent('Salami')
    })

    it("shows Chef's Special when present", () => {
      const composition = makeComposition({
        'chefs-special': [makeIngredient({ name: 'Hot Honey', slug: 'hot-honey' })],
      })
      render(<SummaryCard composition={composition} />)
      const description = screen.getByTestId('sandwich-description')
      expect(description).toHaveTextContent('Hot Honey')
    })

    it("omits Chef's Special from description when not present", () => {
      render(<SummaryCard composition={makeComposition()} />)
      const description = screen.getByTestId('sandwich-description')
      expect(description).not.toHaveTextContent('Hot Honey')
    })
  })

  describe('Share button', () => {
    it('renders a Share button when composition is non-null', () => {
      render(<SummaryCard composition={makeComposition()} />)
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
    })

    it('does not render a Share button when composition is null', () => {
      const { container } = render(<SummaryCard composition={null} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('is disabled while rolling', () => {
      render(<SummaryCard composition={makeComposition()} isRolling />)
      expect(screen.getByRole('button', { name: /share/i })).toBeDisabled()
    })

    it('calls createShare with composition and name on click', async () => {
      mockCreateShare.mockResolvedValue({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
      render(<SummaryCard composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /share/i }))
      await waitFor(() => {
        expect(mockCreateShare).toHaveBeenCalledWith(
          expect.objectContaining({ name: expect.any(String) as string }),
        )
      })
    })

    it('copies the returned URL to clipboard on success', async () => {
      mockCreateShare.mockResolvedValue({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
      render(<SummaryCard composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /share/i }))
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('https://betweenbread.co/s/abc12345')
      })
    })

    it('shows a success toast on copy', async () => {
      mockCreateShare.mockResolvedValue({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
      render(<SummaryCard composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /share/i }))
      await waitFor(() => { expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('copied') as string) })
    })

    it('shows an error toast when createShare throws', async () => {
      mockCreateShare.mockRejectedValue(new Error('network'))
      render(<SummaryCard composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /share/i }))
      await waitFor(() => { expect(mockToastError).toHaveBeenCalled() })
    })

    it('is disabled while the share request is in-flight', () => {
      let resolve: (v: { hash: string; url: string }) => void = () => undefined
      mockCreateShare.mockReturnValue(new Promise<{ hash: string; url: string }>((r) => { resolve = r }))
      render(<SummaryCard composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /share/i }))
      expect(screen.getByRole('button', { name: /share/i })).toBeDisabled()
      resolve({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
    })
  })

  describe('Cost display', () => {
    // Default makeComposition: 5 ingredients × { retail_low: 0.5, retail_high: 1.0, restaurant_low: 1.0, restaurant_high: 2.0 }
    const LAST_UPDATED = '2026-03-01'

    it('shows the retail cost range by default', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      // 5 × retail_low 0.5 = $2.50, 5 × retail_high 1.0 = $5.00
      expect(screen.getByText(/\$2\.50/)).toBeInTheDocument()
      expect(screen.getByText(/\$5\.00/)).toBeInTheDocument()
    })

    it('shows a Retail toggle button', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByRole('button', { name: /^retail$/i })).toBeInTheDocument()
    })

    it('shows a Restaurant toggle button', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByRole('button', { name: /^restaurant$/i })).toBeInTheDocument()
    })

    it('switches to restaurant prices when Restaurant is selected', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      fireEvent.click(screen.getByRole('button', { name: /^restaurant$/i }))
      // 5 × restaurant_high 2.0 = $10.00 — only appears in restaurant context
      expect(screen.getByText(/\$10\.00/)).toBeInTheDocument()
    })

    it('shows the pricing last updated date in the disclaimer', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByText(/2026-03-01/)).toBeInTheDocument()
    })

    it('disclaimer mentions retail pricing by default', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByTestId('cost-disclaimer')).toHaveTextContent(/retail/i)
    })

    it('disclaimer updates to mention restaurant pricing when switched', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      fireEvent.click(screen.getByRole('button', { name: /^restaurant$/i }))
      expect(screen.getByTestId('cost-disclaimer')).toHaveTextContent(/restaurant/i)
    })

    it('fires the cost context toggle event when switching to restaurant', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      fireEvent.click(screen.getByRole('button', { name: /^restaurant$/i }))
      expect(mockCaptureCostContextToggled).toHaveBeenCalledWith({ context: 'restaurant' })
    })

    it('fires the cost context toggle event when switching back to retail', () => {
      render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      fireEvent.click(screen.getByRole('button', { name: /^restaurant$/i }))
      fireEvent.click(screen.getByRole('button', { name: /^retail$/i }))
      expect(mockCaptureCostContextToggled).toHaveBeenLastCalledWith({ context: 'retail' })
    })

    it('does not show cost section when costDataLastUpdated is not provided', () => {
      render(<SummaryCard composition={makeComposition()} />)
      expect(screen.queryByTestId('cost-disclaimer')).not.toBeInTheDocument()
    })

    it('updates the cost range when a new composition is passed', () => {
      const zeroCostIngredient = makeIngredient({
        estimated_cost: { retail_low: 0, retail_high: 0, restaurant_low: 0, restaurant_high: 0 },
      })
      const zeroCostComposition = makeComposition({
        bread: [zeroCostIngredient],
        protein: [zeroCostIngredient],
        cheese: [zeroCostIngredient],
        toppings: [zeroCostIngredient],
        condiments: [zeroCostIngredient],
      })
      const { rerender } = render(<SummaryCard composition={makeComposition()} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByText(/\$2\.50/)).toBeInTheDocument()
      rerender(<SummaryCard composition={zeroCostComposition} costDataLastUpdated={LAST_UPDATED} />)
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument()
    })
  })

  describe('Nutrition panel', () => {
    it('renders the "Show nutrition" toggle when composition is present', () => {
      render(<SummaryCard composition={makeComposition()} />)
      expect(screen.getByRole('button', { name: /show nutrition/i })).toBeInTheDocument()
    })

    it('does not render the nutrition toggle when composition is null', () => {
      const { container } = render(<SummaryCard composition={null} />)
      expect(container).toBeEmptyDOMElement()
    })
  })
})
