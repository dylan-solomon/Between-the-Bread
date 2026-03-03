import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryRow from '@/components/CategoryRow'
import { makeCategory, makeIngredient } from '@/test/factories'

const breadCategory = makeCategory({ name: 'Bread', emoji: '🍞', slug: 'bread' })

const renderRow = (props: Partial<React.ComponentProps<typeof CategoryRow>> = {}) =>
  render(
    <CategoryRow
      category={props.category ?? breadCategory}
      selection={props.selection ?? []}
      cyclingPool={props.cyclingPool ?? []}
      isLocked={props.isLocked ?? false}
      canLock={props.canLock ?? false}
      onToggleLock={props.onToggleLock ?? vi.fn()}
      isDouble={props.isDouble}
      onToggleDouble={props.onToggleDouble}
      isRolling={props.isRolling ?? false}
      onRoll={props.onRoll ?? vi.fn()}
    />,
  )

describe('CategoryRow', () => {
  describe('category identity', () => {
    it('renders the category emoji', () => {
      renderRow()
      expect(screen.getByText('🍞')).toBeInTheDocument()
    })

    it('renders the category name', () => {
      renderRow()
      expect(screen.getByText('Bread')).toBeInTheDocument()
    })
  })

  describe('selection display', () => {
    it('shows a placeholder when selection is empty', () => {
      renderRow()
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('shows the ingredient name for a single selection', () => {
      renderRow({ selection: [makeIngredient({ name: 'Sourdough' })] })
      expect(screen.getByText('Sourdough')).toBeInTheDocument()
    })

    it('joins multiple selections with " & "', () => {
      renderRow({ selection: [makeIngredient({ name: 'Cheddar' }), makeIngredient({ name: 'Swiss' })] })
      expect(screen.getByText('Cheddar & Swiss')).toBeInTheDocument()
    })

    it('does not show a placeholder when a selection is present', () => {
      renderRow({ selection: [makeIngredient({ name: 'Sourdough' })] })
      expect(screen.queryByText('—')).not.toBeInTheDocument()
    })
  })

  describe('lock toggle', () => {
    it('renders a lock button', () => {
      renderRow()
      expect(screen.getByRole('button', { name: /lock/i })).toBeInTheDocument()
    })

    it('has aria-pressed="false" when not locked', () => {
      renderRow({ isLocked: false })
      expect(screen.getByRole('button', { name: /lock/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('has aria-pressed="true" when locked', () => {
      renderRow({ isLocked: true, canLock: true })
      expect(screen.getByRole('button', { name: /lock/i })).toHaveAttribute('aria-pressed', 'true')
    })

    it('is disabled when canLock is false', () => {
      renderRow({ canLock: false })
      expect(screen.getByRole('button', { name: /lock/i })).toBeDisabled()
    })

    it('is enabled when canLock is true', () => {
      renderRow({ canLock: true })
      expect(screen.getByRole('button', { name: /lock/i })).not.toBeDisabled()
    })

    it('calls onToggleLock when clicked', async () => {
      const onToggleLock = vi.fn()
      renderRow({ canLock: true, onToggleLock })
      await userEvent.click(screen.getByRole('button', { name: /lock/i }))
      expect(onToggleLock).toHaveBeenCalledOnce()
    })

    it('does not call onToggleLock when disabled', async () => {
      const onToggleLock = vi.fn()
      renderRow({ canLock: false, onToggleLock })
      await userEvent.click(screen.getByRole('button', { name: /lock/i }))
      expect(onToggleLock).not.toHaveBeenCalled()
    })
  })

  describe('double toggle', () => {
    it('does not render a double button when onToggleDouble is not provided', () => {
      renderRow()
      expect(screen.queryByRole('button', { name: /double/i })).not.toBeInTheDocument()
    })

    it('renders a double button when onToggleDouble is provided', () => {
      renderRow({ onToggleDouble: vi.fn(), isDouble: false })
      expect(screen.getByRole('button', { name: /double/i })).toBeInTheDocument()
    })

    it('has aria-pressed="false" when not doubled', () => {
      renderRow({ onToggleDouble: vi.fn(), isDouble: false })
      expect(screen.getByRole('button', { name: /double/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('has aria-pressed="true" when doubled', () => {
      renderRow({ onToggleDouble: vi.fn(), isDouble: true })
      expect(screen.getByRole('button', { name: /double/i })).toHaveAttribute('aria-pressed', 'true')
    })

    it('calls onToggleDouble when clicked', async () => {
      const onToggleDouble = vi.fn()
      renderRow({ onToggleDouble, isDouble: false })
      await userEvent.click(screen.getByRole('button', { name: /double/i }))
      expect(onToggleDouble).toHaveBeenCalledOnce()
    })
  })

  describe('dice re-roll button', () => {
    it('renders a roll button', () => {
      renderRow()
      expect(screen.getByRole('button', { name: /roll/i })).toBeInTheDocument()
    })

    it('is disabled when the category is locked', () => {
      renderRow({ isLocked: true, canLock: true })
      expect(screen.getByRole('button', { name: /roll/i })).toBeDisabled()
    })

    it('is disabled while a roll is in progress', () => {
      renderRow({ isRolling: true })
      expect(screen.getByRole('button', { name: /roll/i })).toBeDisabled()
    })

    it('is enabled when not locked and not rolling', () => {
      renderRow({ isLocked: false, isRolling: false })
      expect(screen.getByRole('button', { name: /roll/i })).not.toBeDisabled()
    })

    it('calls onRoll when clicked', async () => {
      const onRoll = vi.fn()
      renderRow({ onRoll })
      await userEvent.click(screen.getByRole('button', { name: /roll/i }))
      expect(onRoll).toHaveBeenCalledOnce()
    })

    it('does not call onRoll when locked', async () => {
      const onRoll = vi.fn()
      renderRow({ isLocked: true, canLock: true, onRoll })
      await userEvent.click(screen.getByRole('button', { name: /roll/i }))
      expect(onRoll).not.toHaveBeenCalled()
    })

    it('does not call onRoll while rolling', async () => {
      const onRoll = vi.fn()
      renderRow({ isRolling: true, onRoll })
      await userEvent.click(screen.getByRole('button', { name: /roll/i }))
      expect(onRoll).not.toHaveBeenCalled()
    })
  })
})
