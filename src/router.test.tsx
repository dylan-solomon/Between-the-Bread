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

  it('renders the About page at /about', () => {
    renderRoute('/about')
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('renders the Privacy Policy page at /privacy', () => {
    renderRoute('/privacy')
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
  })

  it('renders the Terms of Service page at /terms', () => {
    renderRoute('/terms')
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
  })

  it('renders the 404 page for unknown routes', () => {
    renderRoute('/this-does-not-exist')
    expect(
      screen.getByText("This Sandwich Doesn't Exist (Yet)"),
    ).toBeInTheDocument()
  })

  it('the 404 page has a link back to the generator', () => {
    renderRoute('/this-does-not-exist')
    expect(screen.getByRole('link', { name: /roll/i })).toHaveAttribute('href', '/')
  })

  it('renders the SharedSandwich page at /s/:hash', () => {
    renderRoute('/s/abc12345')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
