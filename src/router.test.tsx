import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/router'

const renderRoute = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
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
})
