import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

const { mockGetSession, mockOnAuthStateChange, mockSignInWithPassword } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithPassword: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import LoginPage from '@/pages/LoginPage'

const renderPage = (initialRoute = '/login') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignInWithPassword.mockReset()
  mockNavigate.mockReset()

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

describe('LoginPage', () => {
  it('renders a heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
  })

  it('renders email and password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('renders a link to the signup page', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/signup')
  })

  it('renders a link to the forgot password page', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /forgot password/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('calls signIn with email and password on submit', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('navigates to home after successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('navigates to redirect param after successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    renderPage('/login?redirect=/account/settings')

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account/settings', { replace: true })
    })
  })

  it('displays an error message on failed login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
    })
  })

  it('disables the submit button while submitting', async () => {
    mockSignInWithPassword.mockReturnValue(new Promise(() => undefined))
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled()
  })

  it('carries redirect param through to the signup link', () => {
    renderPage('/login?redirect=%2Faccount%2Fsettings')
    const link = screen.getByRole('link', { name: /sign up/i })
    expect(link).toHaveAttribute('href', '/signup?redirect=%2Faccount%2Fsettings')
  })

  it('renders within the app shell', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
