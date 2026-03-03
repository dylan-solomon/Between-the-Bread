import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SummaryCard from '@/components/SummaryCard'
import { makeComposition, makeIngredient } from '@/test/factories'

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
})
