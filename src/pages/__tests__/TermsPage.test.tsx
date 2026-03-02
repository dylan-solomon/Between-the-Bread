import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TermsPage from '@/pages/TermsPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>,
  )

describe('TermsPage', () => {
  it('renders a Terms of Service heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument()
  })

  it('renders within the app shell (header and footer present)', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
