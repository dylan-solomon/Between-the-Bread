import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

const { mockGetSession, mockOnAuthStateChange, mockUpdateUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockUpdateUser: vi.fn(),
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
      updateUser: mockUpdateUser,
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import ResetPasswordPage from '@/pages/ResetPasswordPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <ResetPasswordPage />
      </AuthProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockUpdateUser.mockReset()
  mockNavigate.mockReset()

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

describe('ResetPasswordPage', () => {
  it('renders a heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument()
  })

  it('renders password and confirm password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm.*password/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i)
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with new password on submit', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm.*password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('navigates to login after successful reset', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpass123')
    await userEvent.type(screen.getByLabelText(/confirm.*password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('shows error on failed reset', async () => {
    mockUpdateUser.mockResolvedValue({
      data: {},
      error: { message: 'Password too short' },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abc')
    await userEvent.type(screen.getByLabelText(/confirm.*password/i), 'abc')
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Password too short')
    })
  })

  it('renders within the app shell', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
