import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Header from '@/components/Header'
import type { User, Session } from '@supabase/supabase-js'

const { mockGetSession, mockOnAuthStateChange, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: mockSignOut,
    },
  },
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

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignOut.mockReset()

  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

const renderHeader = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </MemoryRouter>,
  )

describe('Header', () => {
  it('renders the site name', () => {
    renderHeader()
    expect(screen.getByText('Between the Bread')).toBeInTheDocument()
  })

  it('site name links to the home page', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Between the Bread' })).toHaveAttribute('href', '/')
  })

  it('renders a header landmark', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  describe('when guest', () => {
    it('renders a Log in link', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
      })
    })

    it('does not render account dropdown', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: /account/i })).not.toBeInTheDocument()
    })
  })

  describe('when authenticated', () => {
    beforeEach(() => {
      const session = makeSession()
      mockGetSession.mockResolvedValue({ data: { session }, error: null })
    })

    it('shows the user email', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('does not render Log in link', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
      expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
    })

    it('shows account menu with Settings link on click', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: /account/i }))

      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/account/settings')
    })

    it('shows account menu with History link on click', async () => {
      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: /account/i }))

      expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/account/history')
    })

    it('calls signOut when Log out is clicked', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: /account/i }))
      await userEvent.click(screen.getByRole('button', { name: /log out/i }))

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('shows display name when available', async () => {
      const session = makeSession({
        user: makeUser({ user_metadata: { display_name: 'SandwichFan' } }),
      })
      mockGetSession.mockResolvedValue({ data: { session }, error: null })

      renderHeader()
      await waitFor(() => {
        expect(screen.getByText('SandwichFan')).toBeInTheDocument()
      })
    })
  })
})
