import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import type { User, Session } from '@supabase/supabase-js'

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

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

const profileData = {
  display_name: 'SandwichFan',
  dietary_filters: ['vegetarian'],
  smart_mode_default: true,
  double_protein: false,
  double_cheese: true,
  cost_context: 'retail',
}

const profileResponse = {
  data: { profile: profileData },
  meta: { timestamp: '2026-01-01T00:00:00Z' },
}

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockNavigate.mockReset()
  mockFetch.mockReset()

  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }))
})

const renderSettings = async () => {
  const { default: SettingsPage } = await import('@/pages/SettingsPage')
  return render(
    <MemoryRouter initialEntries={['/account/settings']}>
      <AuthProvider>
        <SettingsPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  describe('when guest', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    })

    it('redirects to login', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining('/login'),
          expect.objectContaining({ replace: true }),
        )
      })
    })
  })

  describe('when authenticated', () => {
    beforeEach(() => {
      const session = makeSession()
      mockGetSession.mockResolvedValue({ data: { session }, error: null })
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(profileResponse),
      })
    })

    it('renders the settings heading', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
      })
    })

    it('fetches and displays the profile', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toHaveValue('SandwichFan')
      })
    })

    it('populates dietary filter checkboxes from profile', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toHaveValue('SandwichFan')
      })
      expect(screen.getByRole('checkbox', { name: /vegetarian/i })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /vegan/i })).not.toBeChecked()
    })

    it('populates smart mode toggle from profile', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /smart mode/i })).toBeChecked()
      })
    })

    it('populates double toggles from profile', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /double protein/i })).not.toBeChecked()
      })
      expect(screen.getByRole('checkbox', { name: /double cheese/i })).toBeChecked()
    })

    it('populates cost context from profile', async () => {
      await renderSettings()
      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /retail/i })).toBeChecked()
      })
      expect(screen.getByRole('radio', { name: /restaurant/i })).not.toBeChecked()
    })

    it('saves profile changes on submit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { updated: ['display_name'] } }),
        })

      await renderSettings()
      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toHaveValue('SandwichFan')
      })

      const nameInput = screen.getByLabelText(/display name/i)
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'NewName')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      const patchCall = mockFetch.mock.calls[1] as [string, RequestInit]
      expect(patchCall[1].method).toBe('PATCH')
      expect(JSON.parse(patchCall[1].body as string)).toEqual(
        expect.objectContaining({ display_name: 'NewName' }),
      )
    })

    it('shows success message after saving', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { updated: ['display_name'] } }),
        })

      await renderSettings()
      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toHaveValue('SandwichFan')
      })

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
    })

    it('shows error message when save fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: { message: 'Update failed' } }),
        })

      await renderSettings()
      await waitFor(() => {
        expect(screen.getByLabelText(/display name/i)).toHaveValue('SandwichFan')
      })

      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
