import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseAuth, mockUseProfile, mockNavigate } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseProfile: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useProfile', () => ({ useProfile: mockUseProfile }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useRequireAdmin } from '@/hooks/useRequireAdmin'

const adminProfile = { display_name: null, dietary_filters: [], smart_mode_default: false, double_protein: false, double_cheese: false, cost_context: 'retail' as const, is_admin: true }
const nonAdminProfile = { ...adminProfile, is_admin: false }

const renderWithRouter = () => renderHook(() => useRequireAdmin(), { wrapper: MemoryRouter })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRequireAdmin', () => {
  it('does not redirect while auth or profile is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    mockUseProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderWithRouter()

    expect(result.current.loading).toBe(true)
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    mockUseProfile.mockReturnValue({ profile: null, loading: false })

    renderWithRouter()

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/login'), { replace: true })
  })

  it('redirects home when authenticated but not an admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, loading: false })
    mockUseProfile.mockReturnValue({ profile: nonAdminProfile, loading: false })

    renderWithRouter()

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('returns authorized true and does not redirect for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'admin-1' }, loading: false })
    mockUseProfile.mockReturnValue({ profile: adminProfile, loading: false })

    const { result } = renderWithRouter()

    expect(result.current.loading).toBe(false)
    expect(result.current.authorized).toBe(true)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
