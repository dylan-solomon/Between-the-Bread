import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '@/pages/PrivacyPage'
import { AuthProvider } from '@/context/AuthContext'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
    },
  },
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <PrivacyPage />
      </AuthProvider>
    </MemoryRouter>,
  )

describe('PrivacyPage', () => {
  it('renders a Privacy Policy heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
  })

  it('renders within the app shell (header and footer present)', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
