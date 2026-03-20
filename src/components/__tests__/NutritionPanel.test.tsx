import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NutritionPanel from '@/components/NutritionPanel'
import { makeComposition, makeIngredient } from '@/test/factories'

const { mockCaptureExpanded, mockCaptureCollapsed } = vi.hoisted(() => ({
  mockCaptureExpanded: vi.fn(),
  mockCaptureCollapsed: vi.fn(),
}))

vi.mock('@/analytics/events', () => ({
  captureNutritionPanelExpanded: mockCaptureExpanded,
  captureNutritionPanelCollapsed: mockCaptureCollapsed,
}))

beforeEach(() => {
  mockCaptureExpanded.mockReset()
  mockCaptureCollapsed.mockReset()
})

// Default makeIngredient nutrition: { calories: 100, protein_g: 5, fat_g: 3, carbs_g: 10, fiber_g: 1, sodium_mg: 100, sugar_g: 2 }
// Default makeComposition: 5 ingredients

describe('NutritionPanel', () => {
  describe('collapsed state (default)', () => {
    it('renders a toggle button with "Show nutrition" text', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      expect(screen.getByRole('button', { name: /show nutrition/i })).toBeInTheDocument()
    })

    it('does not show the nutrition grid when collapsed', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      expect(screen.queryByText(/calories/i)).not.toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('shows nutrition values when expanded', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      // 5 × 100 calories = 500
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    it('shows all 7 nutrition labels', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      expect(screen.getByText(/calories/i)).toBeInTheDocument()
      expect(screen.getByText(/protein/i)).toBeInTheDocument()
      expect(screen.getByText(/fat/i)).toBeInTheDocument()
      expect(screen.getByText(/carbs/i)).toBeInTheDocument()
      expect(screen.getByText(/fiber/i)).toBeInTheDocument()
      expect(screen.getByText(/sodium/i)).toBeInTheDocument()
      expect(screen.getByText(/sugar/i)).toBeInTheDocument()
    })

    it('shows correct totals for all nutrition fields', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      // 5 × defaults: cal=500, protein=25g, fat=15g, carbs=50g, fiber=5g, sodium=500mg, sugar=10g
      expect(screen.getByText('500')).toBeInTheDocument()
      expect(screen.getByText('25g')).toBeInTheDocument()
      expect(screen.getByText('15g')).toBeInTheDocument()
      expect(screen.getByText('50g')).toBeInTheDocument()
      expect(screen.getByText('5g')).toBeInTheDocument()
      expect(screen.getByText('500mg')).toBeInTheDocument()
      expect(screen.getByText('10g')).toBeInTheDocument()
    })

    it('changes button text to "Hide nutrition" when expanded', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      expect(screen.getByRole('button', { name: /hide nutrition/i })).toBeInTheDocument()
    })

    it('collapses when the toggle is clicked again', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      fireEvent.click(screen.getByRole('button', { name: /hide nutrition/i }))
      expect(screen.queryByText('500')).not.toBeInTheDocument()
    })

    it('shows the disclaimer text', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      expect(screen.getByText(/nutritional information is estimated/i)).toBeInTheDocument()
    })
  })

  describe('analytics', () => {
    it('fires nutrition_panel_expanded when expanding', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      expect(mockCaptureExpanded).toHaveBeenCalledOnce()
    })

    it('fires nutrition_panel_collapsed when collapsing', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      fireEvent.click(screen.getByRole('button', { name: /hide nutrition/i }))
      expect(mockCaptureCollapsed).toHaveBeenCalledOnce()
    })

    it('does not fire collapsed event on initial render', () => {
      render(<NutritionPanel composition={makeComposition()} />)
      expect(mockCaptureCollapsed).not.toHaveBeenCalled()
    })
  })

  describe('composition changes', () => {
    it('updates nutrition values when composition changes', () => {
      const zeroCal = makeIngredient({ nutrition: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0 } })
      const zeroComposition = makeComposition({
        bread: [zeroCal],
        protein: [zeroCal],
        cheese: [zeroCal],
        toppings: [zeroCal],
        condiments: [zeroCal],
      })

      const { rerender } = render(<NutritionPanel composition={makeComposition()} />)
      fireEvent.click(screen.getByRole('button', { name: /show nutrition/i }))
      expect(screen.getByText('500')).toBeInTheDocument()

      rerender(<NutritionPanel composition={zeroComposition} />)
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.queryByText('500')).not.toBeInTheDocument()
    })
  })
})
