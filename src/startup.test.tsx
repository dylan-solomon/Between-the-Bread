import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { whenRouterReady } from '@/utils/routerReady'

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
})

describe('Startup', () => {
  it.each([
    '/sandwiches',
    '/sandwiches/reuben',
    '/blog',
    '/blog/category/techniques',
    '/blog/vegan-builds',
    '/about',
    '/this-does-not-exist',
  ])('has the page for %s ready to draw as soon as the router is ready', async (path) => {
    const { routes } = await import('@/router')
    const { HelmetProvider } = await import('react-helmet-async')
    const router = createMemoryRouter(routes, { initialEntries: [path] })

    await whenRouterReady(router)
    render(
      <HelmetProvider>
        <RouterProvider router={router} />
      </HelmetProvider>,
    )

    expect(screen.getByRole('main')).not.toBeEmptyDOMElement()
  })
})
