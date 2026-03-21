import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import { makeIngredient } from '@/test/factories'

describe('ChefSpecialRow', () => {
  describe('when not active', () => {
    it('renders nothing when chefsSpecial is null', () => {
      const { container } = render(
        <ChefSpecialRow chefsSpecial={null} isLocked={false} onToggleLock={vi.fn()} />,
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when active', () => {
    const selection = [makeIngredient({ name: 'Hot Honey' })]

    it('renders when chefsSpecial has ingredients', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.getByText(/chef/i)).toBeInTheDocument()
    })

    it('shows the ingredient name', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.getByText('Hot Honey')).toBeInTheDocument()
    })

    it("shows a \"Chef's Special\" label", () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.getByText(/chef'?s special/i)).toBeInTheDocument()
    })

    it('renders a lock button', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.getByRole('button', { name: /lock chef/i })).toBeInTheDocument()
    })

    it('calls onToggleLock when lock button is clicked', async () => {
      const onToggleLock = vi.fn()
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={onToggleLock} />)
      await userEvent.click(screen.getByRole('button', { name: /lock chef/i }))
      expect(onToggleLock).toHaveBeenCalledOnce()
    })

    it('shows unlock label when isLocked is true', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={true} onToggleLock={vi.fn()} />)
      expect(screen.getByRole('button', { name: /unlock chef/i })).toBeInTheDocument()
    })

    it('shows lock label when isLocked is false', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.getByRole('button', { name: /lock chef/i })).toBeInTheDocument()
    })

    it('does not render a dice roll button', () => {
      render(<ChefSpecialRow chefsSpecial={selection} isLocked={false} onToggleLock={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument()
    })
  })
})
