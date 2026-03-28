import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

const { mockGetSession, mockOnAuthStateChange, mockSignUp, mockCaptureAccountSignedUp, mockIdentifyUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignUp: vi.fn(),
  mockCaptureAccountSignedUp: vi.fn(),
  mockIdentifyUser: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: vi.fn(),
      signUp: mockSignUp,
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('@/analytics/events', () => ({
  captureAccountSignedUp: mockCaptureAccountSignedUp,
  identifyUser: mockIdentifyUser,
  captureAccountLoggedOut: vi.fn(),
  resetIdentity: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import SignupPage from '@/pages/SignupPage'

const renderPage = (initialRoute = '/signup') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <SignupPage />
      </AuthProvider>
    </MemoryRouter>,
  )

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignUp.mockReset()
  mockNavigate.mockReset()
  mockCaptureAccountSignedUp.mockReset()
  mockIdentifyUser.mockReset()

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

describe('SignupPage', () => {
  it('renders a heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()
  })

  it('renders email and password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
  })

  it('renders a confirm password field', () => {
    renderPage()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    renderPage()
    const links = screen.getAllByRole('link', { name: /log in/i })
    const bodyLink = links.find((l) => l.closest('main'))
    expect(bodyLink).toHaveAttribute('href', '/login')
  })

  it('calls signUp with email and password on submit', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('navigates to home after successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows error when passwords do not match', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('displays an error message on failed signup', async () => {
    mockSignUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User already registered')
    })
  })

  it('disables the submit button while submitting', async () => {
    mockSignUp.mockReturnValue(new Promise(() => undefined))
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
  })

  it('navigates to redirect param after successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage('/signup?redirect=%2Faccount%2Fsettings')

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account/settings', { replace: true })
    })
  })

  it('renders within the app shell', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('fires captureAccountSignedUp on successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockCaptureAccountSignedUp).toHaveBeenCalledWith({ method: 'email' })
    })
  })

  it('calls identifyUser with user data and direct trigger on successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockIdentifyUser).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'test@example.com',
        signupMethod: 'email',
        signupDate: '2026-01-01T00:00:00Z',
        signupTrigger: 'direct',
      })
    })
  })

  it('passes signup_trigger from URL params to identifyUser', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage('/signup?redirect=%2F&trigger=save_prompt')

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockIdentifyUser).toHaveBeenCalledWith(
        expect.objectContaining({ signupTrigger: 'save_prompt' }),
      )
    })
  })

  it('does not fire analytics on failed signup', async () => {
    mockSignUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockCaptureAccountSignedUp).not.toHaveBeenCalled()
    expect(mockIdentifyUser).not.toHaveBeenCalled()
  })
})
