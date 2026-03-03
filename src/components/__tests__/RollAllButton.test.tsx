import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RollAllButton from '@/components/RollAllButton'

const renderButton = (props: Partial<React.ComponentProps<typeof RollAllButton>> = {}) =>
  render(
    <RollAllButton
      hasRolled={props.hasRolled ?? false}
      isRolling={props.isRolling ?? false}
      onClick={props.onClick ?? vi.fn()}
    />,
  )

describe('RollAllButton', () => {
  describe('label', () => {
    it('shows "Roll the Dice" before the first roll', () => {
      renderButton({ hasRolled: false })
      expect(screen.getByRole('button', { name: /roll the dice/i })).toBeInTheDocument()
    })

    it('shows "Roll Again" after the first roll', () => {
      renderButton({ hasRolled: true })
      expect(screen.getByRole('button', { name: /roll again/i })).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('is disabled while rolling', () => {
      renderButton({ isRolling: true })
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is enabled when not rolling', () => {
      renderButton({ isRolling: false })
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('interaction', () => {
    it('calls onClick when clicked', async () => {
      const onClick = vi.fn()
      renderButton({ onClick })
      await userEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledOnce()
    })

    it('does not call onClick when disabled', async () => {
      const onClick = vi.fn()
      renderButton({ isRolling: true, onClick })
      await userEvent.click(screen.getByRole('button'))
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('pulse animation', () => {
    it('has the pulse class before the first roll', () => {
      renderButton({ hasRolled: false, isRolling: false })
      expect(screen.getByRole('button')).toHaveClass('animate-pulse')
    })

    it('does not pulse after the first roll', () => {
      renderButton({ hasRolled: true })
      expect(screen.getByRole('button')).not.toHaveClass('animate-pulse')
    })

    it('does not pulse while rolling', () => {
      renderButton({ hasRolled: false, isRolling: true })
      expect(screen.getByRole('button')).not.toHaveClass('animate-pulse')
    })
  })
})
