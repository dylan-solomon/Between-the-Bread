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
      // Sourdough (non-flat bread) renders as two layers: top and bottom
      expect(screen.getAllByLabelText('Sourdough')).toHaveLength(2)
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

    it('renders no cheese layer when no-cheese is selected', () => {
      const composition = makeComposition({
        cheese: [makeIngredient({ name: 'No Cheese', slug: 'no-cheese' })],
      })
      render(<SandwichVisual composition={composition} />)
      expect(screen.queryByLabelText('No Cheese')).not.toBeInTheDocument()
    })

    describe('bread layer logic', () => {
      it('renders two bread layers for non-flat bread', () => {
        const composition = makeComposition({
          bread: [makeIngredient({ name: 'Sourdough', slug: 'sourdough' })],
        })
        render(<SandwichVisual composition={composition} />)
        expect(screen.getAllByLabelText('Sourdough')).toHaveLength(2)
      })

      it('renders one bread layer for pita', () => {
        const composition = makeComposition({
          bread: [makeIngredient({ name: 'Pita', slug: 'pita' })],
        })
        render(<SandwichVisual composition={composition} />)
        expect(screen.getAllByLabelText('Pita')).toHaveLength(1)
      })

      it('renders one bread layer for naan', () => {
        const composition = makeComposition({
          bread: [makeIngredient({ name: 'Naan', slug: 'naan' })],
        })
        render(<SandwichVisual composition={composition} />)
        expect(screen.getAllByLabelText('Naan')).toHaveLength(1)
      })

      it('renders one bread layer for tortilla', () => {
        const composition = makeComposition({
          bread: [makeIngredient({ name: 'Tortilla', slug: 'tortilla' })],
        })
        render(<SandwichVisual composition={composition} />)
        expect(screen.getAllByLabelText('Tortilla')).toHaveLength(1)
      })
    })
  })
})
