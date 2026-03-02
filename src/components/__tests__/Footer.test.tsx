import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '@/components/Footer'

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )

describe('Footer', () => {
  it('renders the site name', () => {
    renderFooter()
    expect(screen.getByText('Between the Bread')).toBeInTheDocument()
  })

  it('renders a Generator link to the home page', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Generator' })).toHaveAttribute('href', '/')
  })

  it('renders an About link', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })

  it('renders a Privacy Policy link', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders a Terms of Service link', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/terms',
    )
  })

  it('renders a copyright notice', () => {
    renderFooter()
    expect(screen.getByText(/© 2026 Between the Bread/)).toBeInTheDocument()
  })

  it('renders a contentinfo landmark', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
