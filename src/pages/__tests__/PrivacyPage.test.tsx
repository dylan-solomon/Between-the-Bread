import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import PrivacyPage from '@/pages/PrivacyPage'
import { CONTACT_EMAIL } from '@/data/site'
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
    <HelmetProvider>
      <MemoryRouter>
        <AuthProvider>
          <PrivacyPage />
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('PrivacyPage', () => {
  it('renders a Privacy Policy heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
  })

  it('says when the policy last changed', () => {
    renderPage()
    expect(screen.getByText('Last updated: October 3, 2026')).toBeInTheDocument()
  })

  it.each([
    'Information you give us',
    'What is public',
    'Analytics',
    'Cookies and browser storage',
    'Who we share information with',
    'How long we keep information',
    'Your choices',
    'Children',
    'Changes to this policy',
    'Contact us',
  ])('covers %s', (section) => {
    renderPage()
    expect(screen.getByRole('heading', { level: 2, name: section })).toBeInTheDocument()
  })

  it('explains that usernames, comments and community sandwiches are public', () => {
    renderPage()
    expect(screen.getByText(/Your username is public/)).toBeInTheDocument()
    expect(screen.getByText(/can appear on our public community leaderboard/)).toBeInTheDocument()
  })

  it('says we do not sell personal information', () => {
    renderPage()
    expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument()
  })

  it('tells people how to delete their account', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/account/settings')
  })

  it('gives an email address for privacy questions', () => {
    renderPage()
    const links = screen.getAllByRole('link', { name: CONTACT_EMAIL })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => { expect(link).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`) })
  })
})
