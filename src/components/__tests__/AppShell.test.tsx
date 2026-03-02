import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '@/components/AppShell'

const renderAppShell = (children?: React.ReactNode) =>
  render(
    <MemoryRouter>
      <AppShell>{children}</AppShell>
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
