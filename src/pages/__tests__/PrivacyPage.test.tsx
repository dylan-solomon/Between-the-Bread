import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '@/pages/PrivacyPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  )

describe('PrivacyPage', () => {
  it('renders a Privacy Policy heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument()
  })

  it('renders within the app shell (header and footer present)', () => {
    renderPage()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
