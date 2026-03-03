import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SandwichVisual from '@/components/SandwichVisual'
import { makeComposition, makeIngredient } from '@/test/factories'

describe('SandwichVisual', () => {
  describe('empty state (no composition)', () => {
    it('shows the empty state prompt', () => {
      render(<SandwichVisual composition={null} />)
      expect(screen.getByText(/roll the dice/i)).toBeInTheDocument()
    })

    it('does not render any ingredient layers', () => {
      render(<SandwichVisual composition={null} />)
      expect(screen.queryAllByRole('img')).toHaveLength(0)
    })
  })

  describe('with a composition', () => {
    it('does not show the empty state prompt', () => {
      render(<SandwichVisual composition={makeComposition()} />)
      expect(screen.queryByText(/roll the dice/i)).not.toBeInTheDocument()
    })

    it('renders a layer for each selected ingredient', () => {
      const composition = makeComposition()
      render(<SandwichVisual composition={composition} />)
      // 5 ingredients in makeComposition — each gets an aria-label layer
      expect(screen.getByLabelText('Sourdough')).toBeInTheDocument()
      expect(screen.getByLabelText('Turkey')).toBeInTheDocument()
      expect(screen.getByLabelText('Swiss')).toBeInTheDocument()
      expect(screen.getByLabelText('Lettuce')).toBeInTheDocument()
      expect(screen.getByLabelText('Mayo')).toBeInTheDocument()
    })

    it('renders double protein as two separate layers', () => {
      const composition = makeComposition({
        protein: [
          makeIngredient({ name: 'Pastrami', slug: 'pastrami' }),
          makeIngredient({ name: 'Salami', slug: 'salami' }),
        ],
      })
      render(<SandwichVisual composition={composition} />)
      expect(screen.getByLabelText('Pastrami')).toBeInTheDocument()
      expect(screen.getByLabelText('Salami')).toBeInTheDocument()
    })

    it('renders Chef\'s Special layer when present', () => {
      const composition = makeComposition({
        'chefs-special': [makeIngredient({ name: 'Hot Honey', slug: 'hot-honey' })],
      })
      render(<SandwichVisual composition={composition} />)
      expect(screen.getByLabelText('Hot Honey')).toBeInTheDocument()
    })
  })
})
