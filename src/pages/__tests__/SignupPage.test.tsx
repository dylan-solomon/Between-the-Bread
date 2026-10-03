import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

const { mockGetSession, mockOnAuthStateChange, mockSignUp, mockCaptureAccountSignedUp, mockIdentifyUser, mockCheckUsername } = vi.hoisted(() => ({
  mockCheckUsername: vi.fn(),
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

vi.mock('@/api/usernames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/usernames')>()),
  checkUsername: mockCheckUsername,
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
  mockCheckUsername.mockReset()
  mockCheckUsername.mockResolvedValue('available')

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

const fillForm = async ({ username = 'sandwich_fan', confirm = 'password123' } = {}) => {
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  if (username !== '') await userEvent.type(screen.getByLabelText('Username'), username)
  await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm)
  if (username !== '') await screen.findByText(/Available!|already taken|isn't available|characters|letters/)
}

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
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })

  it('calls signUp with email and password on submit', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: { data: { username: 'sandwich_fan' } },
    })
  })

  it('navigates to home after successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows error when passwords do not match', async () => {
    renderPage()

    await fillForm({ confirm: 'different' })
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

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User already registered')
    })
  })

  it('disables the submit button while submitting', async () => {
    mockSignUp.mockReturnValue(new Promise(() => undefined))
    renderPage()

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
  })

  it('navigates to redirect param after successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage('/signup?redirect=%2Faccount%2Fsettings')

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account/settings', { replace: true })
    })
  })

  it('fires captureAccountSignedUp on successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockCaptureAccountSignedUp).toHaveBeenCalledWith({ method: 'email' })
    })
  })

  it('calls identifyUser with user data and direct trigger on successful signup', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await fillForm()
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

    await fillForm()
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

    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(mockCaptureAccountSignedUp).not.toHaveBeenCalled()
    expect(mockIdentifyUser).not.toHaveBeenCalled()
  })
})

describe('SignupPage usernames', () => {
  it('asks for a username and explains where it appears', () => {
    renderPage()

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByText(/appears on your comments and on community sandwiches/)).toBeInTheDocument()
  })

  it('says whether the username is free as it is typed', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Username'), 'sandwich_fan')

    expect(await screen.findByText('Available!')).toBeInTheDocument()
    expect(mockCheckUsername).toHaveBeenCalledWith('sandwich_fan')
  })

  it.each([
    ['taken', 'taken_name', 'That username is already taken.'],
    ['badly formed', 'a b', 'Use only letters, numbers and underscores.'],
  ])('will not sign up with a %s username', async (_label, username, message) => {
    mockCheckUsername.mockResolvedValue('taken')
    renderPage()

    await fillForm({ username })
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('will not sign up without a username', async () => {
    renderPage()

    await fillForm({ username: '' })
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a username.')
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('still signs up when the availability check could not be done', async () => {
    mockCheckUsername.mockRejectedValue(new Error('offline'))
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' }, session: {} }, error: null })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Username'), 'sandwich_fan')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await screen.findByText(/Couldn't check/)
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(mockSignUp).toHaveBeenCalled()
  })
})
