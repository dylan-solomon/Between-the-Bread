import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '@/components/AppShell'
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

const renderAppShell = (children?: React.ReactNode) =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </MemoryRouter>,
  )

describe('AppShell', () => {
  it('renders the header', () => {
    renderAppShell()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders the footer', () => {
    renderAppShell()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders a main content area', () => {
    renderAppShell()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders children inside the main content area', () => {
    renderAppShell(<p>Hello sandwich</p>)
    expect(screen.getByRole('main')).toHaveTextContent('Hello sandwich')
  })
})
