import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { routes } from '@/router'

const renderRoute = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>,
  )
}

describe('Router', () => {
  it('renders the home page at /', () => {
    renderRoute('/')
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders the About page at /about', async () => {
    renderRoute('/about')
    expect(await screen.findByRole('heading', { name: 'About Between the Bread' })).toBeInTheDocument()
  })

  it('renders the Privacy Policy page at /privacy', async () => {
    renderRoute('/privacy')
    expect(await screen.findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
  })

  it('renders the Terms of Service page at /terms', async () => {
    renderRoute('/terms')
    expect(await screen.findByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
  })

  it('renders the blog index at /blog', async () => {
    renderRoute('/blog')
    expect(await screen.findByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument()
  })

  it('renders a blog post at /blog/:slug', () => {
    renderRoute('/blog/vegan-builds')
    return screen.findByRole('status', { name: 'Loading post' })
  })

  it('renders the 404 page for unknown routes', async () => {
    renderRoute('/this-does-not-exist')
    expect(
      await screen.findByText("This Sandwich Doesn't Exist (Yet)"),
    ).toBeInTheDocument()
  })

  it('the 404 page has a link back to the generator', async () => {
    renderRoute('/this-does-not-exist')
    expect(await screen.findByRole('link', { name: /roll/i })).toHaveAttribute('href', '/')
  })

  it('renders the SharedSandwich page at /s/:hash', async () => {
    renderRoute('/s/abc12345')
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('renders the encyclopedia index at /sandwiches', async () => {
    renderRoute('/sandwiches')
    expect(await screen.findByRole('heading', { name: 'Sandwich Encyclopedia' })).toBeInTheDocument()
  })

  it('renders the encyclopedia entry page at /sandwiches/:slug', async () => {
    renderRoute('/sandwiches/reuben')
    expect(await screen.findByRole('status', { name: 'Loading sandwich' })).toBeInTheDocument()
  })
})

describe('Site shell', () => {
  it.each([
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/account/settings',
    '/account/history',
    '/sandwiches',
    '/sandwiches/reuben',
    '/s/abc12345',
    '/admin',
    '/admin/database',
    '/this-does-not-exist',
  ])('shows one header, one footer and one main area at %s', async (path) => {
    renderRoute(path)

    await screen.findByRole('banner')

    await waitFor(() => {
      expect(screen.getAllByRole('banner')).toHaveLength(1)
      expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
      expect(screen.getAllByRole('main')).toHaveLength(1)
    })
  })

  it('links to the encyclopedia from the header on every page', async () => {
    renderRoute('/sandwiches')

    const header = await screen.findByRole('banner')

    expect(header).toHaveTextContent('Sandwiches')
  })
})
