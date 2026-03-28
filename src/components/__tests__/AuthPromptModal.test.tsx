import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AuthPromptModal from '@/components/AuthPromptModal'

const defaultProps = {
  isOpen: true,
  actionLabel: 'save your sandwich',
  onDismiss: vi.fn(),
}

const renderModal = (overrides: Partial<typeof defaultProps> = {}) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthPromptModal {...defaultProps} {...overrides} />
    </MemoryRouter>,
  )

describe('AuthPromptModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders a dialog when isOpen is true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays the action label in the message', () => {
    renderModal({ actionLabel: 'rate this sandwich' })
    expect(screen.getByText(/log in to rate this sandwich/i)).toBeInTheDocument()
  })

  it('has a Log in link that navigates to /login with redirect and trigger', () => {
    renderModal({ actionLabel: 'save your sandwich' })
    const link = screen.getByRole('link', { name: /log in/i })
    expect(link).toHaveAttribute('href', '/login?redirect=%2F&trigger=save_prompt')
  })

  it('maps rate action label to rate_prompt trigger', () => {
    renderModal({ actionLabel: 'rate this sandwich' })
    const link = screen.getByRole('link', { name: /log in/i })
    expect(link).toHaveAttribute('href', '/login?redirect=%2F&trigger=rate_prompt')
  })

  it('has a Not now button that calls onDismiss', async () => {
    const onDismiss = vi.fn()
    renderModal({ onDismiss })
    await userEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Escape key is pressed', async () => {
    const onDismiss = vi.fn()
    renderModal({ onDismiss })
    await userEvent.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when the overlay is clicked', async () => {
    const onDismiss = vi.fn()
    renderModal({ onDismiss })
    const overlay = screen.getByTestId('auth-prompt-overlay')
    await userEvent.click(overlay)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not call onDismiss when the modal content is clicked', async () => {
    const onDismiss = vi.fn()
    renderModal({ onDismiss })
    await userEvent.click(screen.getByRole('dialog'))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('has aria-modal set to true', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onDismiss when the Log in link is clicked', async () => {
    const onDismiss = vi.fn()
    renderModal({ onDismiss })
    await userEvent.click(screen.getByRole('link', { name: /log in/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
