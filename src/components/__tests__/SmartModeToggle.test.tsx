import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SmartModeToggle from '@/components/SmartModeToggle'

const renderToggle = (isActive = false, onToggle = vi.fn()) =>
  render(<SmartModeToggle isActive={isActive} onToggle={onToggle} />)

describe('SmartModeToggle', () => {
  describe('rendering', () => {
    it('renders a Smart Mode switch', () => {
      renderToggle()
      expect(screen.getByRole('switch', { name: /smart mode/i })).toBeInTheDocument()
    })

    it('switch is aria-checked=false when inactive', () => {
      renderToggle(false)
      expect(screen.getByRole('switch', { name: /smart mode/i })).toHaveAttribute('aria-checked', 'false')
    })

    it('switch is aria-checked=true when active', () => {
      renderToggle(true)
      expect(screen.getByRole('switch', { name: /smart mode/i })).toHaveAttribute('aria-checked', 'true')
    })

    it('has a tooltip describing the feature', () => {
      renderToggle()
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('calls onToggle when clicked', async () => {
      const onToggle = vi.fn()
      renderToggle(false, onToggle)
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledOnce()
    })

    it('calls onToggle with true when activating', async () => {
      const onToggle = vi.fn()
      renderToggle(false, onToggle)
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledWith(true)
    })

    it('calls onToggle with false when deactivating', async () => {
      const onToggle = vi.fn()
      renderToggle(true, onToggle)
      await userEvent.click(screen.getByRole('switch', { name: /smart mode/i }))
      expect(onToggle).toHaveBeenCalledWith(false)
    })
  })
})
