import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import { makeIngredient } from '@/test/factories'

describe('ChefSpecialRow', () => {
  describe('when not active', () => {
    it('renders nothing when chefsSpecial is null', () => {
      const { container } = render(<ChefSpecialRow chefsSpecial={null} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when active', () => {
    const selection = [makeIngredient({ name: 'Hot Honey' })]

    it('renders when chefsSpecial has ingredients', () => {
      render(<ChefSpecialRow chefsSpecial={selection} />)
      expect(screen.getByText(/chef/i)).toBeInTheDocument()
    })

    it('shows the ingredient name', () => {
      render(<ChefSpecialRow chefsSpecial={selection} />)
      expect(screen.getByText('Hot Honey')).toBeInTheDocument()
    })

    it('shows a "Chef\'s Special" label', () => {
      render(<ChefSpecialRow chefsSpecial={selection} />)
      expect(screen.getByText(/chef'?s special/i)).toBeInTheDocument()
    })

    it('does not render a lock button', () => {
      render(<ChefSpecialRow chefsSpecial={selection} />)
      expect(screen.queryByRole('button', { name: /lock/i })).not.toBeInTheDocument()
    })

    it('does not render a dice roll button', () => {
      render(<ChefSpecialRow chefsSpecial={selection} />)
      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument()
    })
  })
})
