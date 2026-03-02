import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '@/components/Header'

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )

describe('Header', () => {
  it('renders the site name', () => {
    renderHeader()
    expect(screen.getByText('Between the Bread')).toBeInTheDocument()
  })

  it('site name links to the home page', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Between the Bread' })).toHaveAttribute('href', '/')
  })

  it('renders a Log in link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })

  it('renders a header landmark', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
