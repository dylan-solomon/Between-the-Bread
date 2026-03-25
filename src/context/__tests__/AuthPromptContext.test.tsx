import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthPromptProvider, useAuthPrompt } from '@/context/AuthPromptContext'

const { mockCaptureAuthPrompted, mockCaptureAuthPromptDismissed } = vi.hoisted(() => ({
  mockCaptureAuthPrompted: vi.fn(),
  mockCaptureAuthPromptDismissed: vi.fn(),
}))

vi.mock('@/analytics/events', () => ({
  captureAuthPrompted: mockCaptureAuthPrompted,
  captureAuthPromptDismissed: mockCaptureAuthPromptDismissed,
}))

vi.mock('@/components/AuthPromptModal', () => ({
  default: () => null,
}))

const TestConsumer = () => {
  const { isOpen, actionLabel, prompt, dismiss } = useAuthPrompt()
  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="action-label">{actionLabel}</span>
      <button data-testid="prompt-btn" onClick={() => { prompt('save your sandwich') }}>Prompt</button>
      <button data-testid="dismiss-btn" onClick={() => { dismiss() }}>Dismiss</button>
    </div>
  )
}

const renderWithProvider = () =>
  render(
    <AuthPromptProvider>
      <TestConsumer />
    </AuthPromptProvider>,
  )

describe('AuthPromptContext', () => {
  it('starts closed with empty action label', () => {
    renderWithProvider()
    expect(screen.getByTestId('is-open').textContent).toBe('false')
    expect(screen.getByTestId('action-label').textContent).toBe('')
  })

  it('opens the prompt with the given action label', () => {
    renderWithProvider()
    act(() => { screen.getByTestId('prompt-btn').click() })
    expect(screen.getByTestId('is-open').textContent).toBe('true')
    expect(screen.getByTestId('action-label').textContent).toBe('save your sandwich')
  })

  it('fires captureAuthPrompted when prompt is called', () => {
    renderWithProvider()
    act(() => { screen.getByTestId('prompt-btn').click() })
    expect(mockCaptureAuthPrompted).toHaveBeenCalledWith({ actionAttempted: 'save your sandwich' })
  })

  it('closes the prompt on dismiss', () => {
    renderWithProvider()
    act(() => { screen.getByTestId('prompt-btn').click() })
    act(() => { screen.getByTestId('dismiss-btn').click() })
    expect(screen.getByTestId('is-open').textContent).toBe('false')
  })

  it('fires captureAuthPromptDismissed when dismiss is called while open', () => {
    renderWithProvider()
    act(() => { screen.getByTestId('prompt-btn').click() })
    mockCaptureAuthPromptDismissed.mockClear()
    act(() => { screen.getByTestId('dismiss-btn').click() })
    expect(mockCaptureAuthPromptDismissed).toHaveBeenCalledWith({ actionAttempted: 'save your sandwich' })
  })

  it('does not fire captureAuthPromptDismissed when dismiss is called while closed', () => {
    renderWithProvider()
    mockCaptureAuthPromptDismissed.mockClear()
    act(() => { screen.getByTestId('dismiss-btn').click() })
    expect(mockCaptureAuthPromptDismissed).not.toHaveBeenCalled()
  })

  it('throws when useAuthPrompt is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => { render(<TestConsumer />) }).toThrow('useAuthPrompt must be used within an AuthPromptProvider')
    spy.mockRestore()
  })
})
