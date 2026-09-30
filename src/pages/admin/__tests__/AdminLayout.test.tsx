import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const { mockUseRequireAdmin } = vi.hoisted(() => ({ mockUseRequireAdmin: vi.fn() }))
vi.mock('@/hooks/useRequireAdmin', () => ({ useRequireAdmin: mockUseRequireAdmin }))

import AdminLayout from '@/pages/admin/AdminLayout'

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Dashboard content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => { vi.clearAllMocks() })

describe('AdminLayout', () => {
  it('renders nothing while loading', () => {
    mockUseRequireAdmin.mockReturnValue({ loading: true, authorized: false })
    const { container } = renderLayout()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when not authorized', () => {
    mockUseRequireAdmin.mockReturnValue({ loading: false, authorized: false })
    const { container } = renderLayout()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the sidebar nav and the routed content when authorized', () => {
    mockUseRequireAdmin.mockReturnValue({ loading: false, authorized: true })
    renderLayout()

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingredients' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sandwiches' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compatibility' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Moderation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Config' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('leaves the main landmark to the site shell', () => {
    mockUseRequireAdmin.mockReturnValue({ loading: false, authorized: true })
    renderLayout()

    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })
})
