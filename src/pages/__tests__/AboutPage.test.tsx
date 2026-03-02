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
  it('renders an About heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('renders within the app shell (header and footer present)', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
