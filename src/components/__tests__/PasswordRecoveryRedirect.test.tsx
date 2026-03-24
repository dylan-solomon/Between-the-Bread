import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import PasswordRecoveryRedirect from '@/components/PasswordRecoveryRedirect'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const { mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

let capturedAuthCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockNavigate.mockReset()
  capturedAuthCallback = null

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation((cb: (event: AuthChangeEvent, session: Session | null) => void) => {
    capturedAuthCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})

const renderWithProviders = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <PasswordRecoveryRedirect />
      </AuthProvider>
    </MemoryRouter>,
  )

describe('PasswordRecoveryRedirect', () => {
  it('renders nothing', () => {
    const { container } = renderWithProviders()
    expect(container.innerHTML).toBe('')
  })

  it('does not navigate when no password recovery event', () => {
    renderWithProviders()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /reset-password on PASSWORD_RECOVERY event', async () => {
    renderWithProviders()

    capturedAuthCallback?.('PASSWORD_RECOVERY' as AuthChangeEvent, null)

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/reset-password', { replace: true })
    })
  })

  it('navigates only once per PASSWORD_RECOVERY event', async () => {
    renderWithProviders()

    capturedAuthCallback?.('PASSWORD_RECOVERY' as AuthChangeEvent, null)

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })
  })
})
