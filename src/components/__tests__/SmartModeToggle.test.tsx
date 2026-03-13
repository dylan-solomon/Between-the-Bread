import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SmartModeToggle from '@/components/SmartModeToggle'

const renderToggle = (isActive = false, onToggle = vi.fn()) =>
  render(<SmartModeToggle isActive={isActive} onToggle={onToggle} />)

describe('SmartModeToggle', () => {
  describe('rendering', () => {
    it('renders a Smart Mode button', () => {
      renderToggle()
      expect(screen.getByRole('button', { name: /smart mode/i })).toBeInTheDocument()
    })

    it('button is aria-pressed=false when inactive', () => {
      renderToggle(false)
      expect(screen.getByRole('button', { name: /smart mode/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('button is aria-pressed=true when active', () => {
      renderToggle(true)
      expect(screen.getByRole('button', { name: /smart mode/i })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('interaction', () => {
    it('calls onToggle when clicked', async () => {
      const onToggle = vi.fn()
      renderToggle(false, onToggle)
      await userEvent.click(screen.getByRole('button', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledOnce()
    })

    it('calls onToggle with true when activating', async () => {
      const onToggle = vi.fn()
      renderToggle(false, onToggle)
      await userEvent.click(screen.getByRole('button', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('calls onToggle with false when deactivating', async () => {
      const onToggle = vi.fn()
      renderToggle(true, onToggle)
      await userEvent.click(screen.getByRole('button', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledWith(false)
    })
  })
})
