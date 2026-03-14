import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from '@/pages/AboutPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  )

describe('AboutPage', () => {
  it('renders the About Between the Bread heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'About Between the Bread' })).toBeInTheDocument()
  })

  it('renders within the app shell (header and footer present)', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('renders the core mission statement', () => {
    renderPage()
    expect(screen.getByText(/The world needs more unpredictable sandwiches/)).toBeInTheDocument()
  })

  it('renders the belief statements', () => {
    renderPage()
    expect(screen.getByText(/Every ingredient deserves a moment between the bread/)).toBeInTheDocument()
    expect(screen.getByText(/No flavor combination should feel too safe/)).toBeInTheDocument()
    expect(screen.getByText(/Culinary destiny is better when randomized/)).toBeInTheDocument()
  })

  it('renders the closing call to action', () => {
    renderPage()
    expect(screen.getByText(/Generate boldly/)).toBeInTheDocument()
    expect(screen.getByText(/The bread is waiting/)).toBeInTheDocument()
  })
})
