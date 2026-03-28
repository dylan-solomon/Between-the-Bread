import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void

const { mockGetSession, mockOnAuthStateChange, mockSignInWithPassword, mockSignUp, mockSignInWithOAuth, mockSignOut, mockCaptureAccountLoggedOut, mockResetIdentity } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignUp: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
  mockCaptureAccountLoggedOut: vi.fn(),
  mockResetIdentity: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  },
}))

vi.mock('@/analytics/events', () => ({
  captureAccountLoggedOut: mockCaptureAccountLoggedOut,
  resetIdentity: mockResetIdentity,
}))

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  ...overrides,
} as User)

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'token-abc',
  refresh_token: 'refresh-abc',
  expires_in: 3600,
  token_type: 'bearer',
  user: makeUser(),
  ...overrides,
} as Session)

const AuthConsumer = () => {
  const { user, session, loading, passwordRecovery } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <span data-testid="session">{session ? 'active' : 'none'}</span>
      <span data-testid="password-recovery">{String(passwordRecovery)}</span>
    </div>
  )
}

const ClearRecoveryButton = () => {
  const { clearPasswordRecovery } = useAuth()
  return <button onClick={clearPasswordRecovery}>Clear Recovery</button>
}

const SignInButton = () => {
  const { signIn } = useAuth()
  return <button onClick={() => void signIn('test@example.com', 'password123')}>Sign In</button>
}

const SignUpButton = () => {
  const { signUp } = useAuth()
  return <button onClick={() => void signUp('test@example.com', 'password123')}>Sign Up</button>
}

const SignOutButton = () => {
  const { signOut } = useAuth()
  return <button onClick={() => void signOut()}>Sign Out</button>
}

const OAuthButton = () => {
  const { signInWithOAuth } = useAuth()
  return <button onClick={() => void signInWithOAuth('google')}>Google</button>
}

let authCallback: AuthCallback

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignInWithPassword.mockReset()
  mockSignUp.mockReset()
  mockSignInWithOAuth.mockReset()
  mockSignOut.mockReset()
  mockCaptureAccountLoggedOut.mockReset()
  mockResetIdentity.mockReset()

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation((cb: AuthCallback) => {
    authCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
})

describe('AuthProvider', () => {
  it('starts in loading state', () => {
    mockGetSession.mockReturnValue(new Promise(() => undefined))
    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('resolves to no user when session is null', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('resolves to authenticated user when session exists', async () => {
    const session = makeSession()
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('session')).toHaveTextContent('active')
  })

  it('updates state when auth state changes', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('none')

    const session = makeSession()
    act(() => { authCallback('SIGNED_IN', session) })

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('session')).toHaveTextContent('active')
  })

  it('clears state on sign out event', async () => {
    const session = makeSession()
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    act(() => { authCallback('SIGNED_OUT', null) })

    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('session')).toHaveTextContent('none')
  })

  it('signIn calls supabase signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })

    render(<AuthProvider><SignInButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('signIn returns user data on success', async () => {
    const user = makeUser()
    mockSignInWithPassword.mockResolvedValue({ data: { user, session: makeSession() }, error: null })

    let returnedUser: User | undefined
    const CaptureSignIn = () => {
      const { signIn } = useAuth()
      return (
        <button onClick={() => { void signIn('test@example.com', 'password123').then((u) => { returnedUser = u }) }}>
          Sign In
        </button>
      )
    }

    render(<AuthProvider><CaptureSignIn /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => { expect(returnedUser).toBeDefined() })
    expect(returnedUser?.id).toBe('user-123')
    expect(returnedUser?.email).toBe('test@example.com')
  })

  it('signUp calls supabase signUp', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null })

    render(<AuthProvider><SignUpButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('signUp returns user data on success', async () => {
    const user = makeUser()
    mockSignUp.mockResolvedValue({ data: { user, session: makeSession() }, error: null })

    let returnedUser: User | undefined
    const CaptureSignUp = () => {
      const { signUp } = useAuth()
      return (
        <button onClick={() => { void signUp('test@example.com', 'password123').then((u) => { returnedUser = u }) }}>
          Sign Up
        </button>
      )
    }

    render(<AuthProvider><CaptureSignUp /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Up' }))

    await waitFor(() => { expect(returnedUser).toBeDefined() })
    expect(returnedUser?.id).toBe('user-123')
    expect(returnedUser?.email).toBe('test@example.com')
  })

  it('signOut calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    render(<AuthProvider><SignOutButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('signInWithOAuth calls supabase signInWithOAuth with provider', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

    render(<AuthProvider><OAuthButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Google' }))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' })
  })

  it('sets passwordRecovery to true on PASSWORD_RECOVERY event', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('password-recovery')).toHaveTextContent('false')

    act(() => { authCallback('PASSWORD_RECOVERY', null) })

    expect(screen.getByTestId('password-recovery')).toHaveTextContent('true')
  })

  it('clearPasswordRecovery resets the flag to false', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
        <ClearRecoveryButton />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    act(() => { authCallback('PASSWORD_RECOVERY', null) })
    expect(screen.getByTestId('password-recovery')).toHaveTextContent('true')

    await userEvent.click(screen.getByRole('button', { name: 'Clear Recovery' }))
    expect(screen.getByTestId('password-recovery')).toHaveTextContent('false')
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    const mockUnsubscribe = vi.fn()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    const { unmount } = render(<AuthProvider><AuthConsumer /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('signOut fires captureAccountLoggedOut before signing out', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    render(<AuthProvider><SignOutButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(mockCaptureAccountLoggedOut).toHaveBeenCalled()
    expect(mockCaptureAccountLoggedOut.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    )
  })

  it('signOut calls resetIdentity', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    render(<AuthProvider><SignOutButton /></AuthProvider>)
    await waitFor(() => { expect(mockGetSession).toHaveBeenCalled() })

    await userEvent.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(mockResetIdentity).toHaveBeenCalled()
  })
})

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })
})
