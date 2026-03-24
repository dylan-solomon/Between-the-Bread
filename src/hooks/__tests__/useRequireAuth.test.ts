import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequireAuth } from '@/hooks/useRequireAuth'

const mockNavigate = vi.fn()
const mockPathname = vi.fn<() => string>().mockReturnValue('/account/settings')
const mockSearch = vi.fn<() => string>().mockReturnValue('')

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname(), search: mockSearch() }),
}))

const mockUseAuth = vi.fn<() => { user: { id: string } | null; loading: boolean }>()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  mockNavigate.mockReset()
  mockUseAuth.mockReset()
  mockPathname.mockReturnValue('/account/settings')
  mockSearch.mockReturnValue('')
})

describe('useRequireAuth', () => {
  it('returns loading true while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { result } = renderHook(() => useRequireAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.authenticated).toBe(false)
  })

  it('does not redirect while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    renderHook(() => useRequireAuth())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('redirects to login with current path when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderHook(() => useRequireAuth())
    expect(mockNavigate).toHaveBeenCalledWith('/login?redirect=%2Faccount%2Fsettings', { replace: true })
  })

  it('includes search params in the redirect path', () => {
    mockPathname.mockReturnValue('/account/history')
    mockSearch.mockReturnValue('?q=turkey')
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderHook(() => useRequireAuth())
    expect(mockNavigate).toHaveBeenCalledWith(
      '/login?redirect=%2Faccount%2Fhistory%3Fq%3Dturkey',
      { replace: true },
    )
  })

  it('returns authenticated true when user exists', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, loading: false })
    const { result } = renderHook(() => useRequireAuth())
    expect(result.current.authenticated).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('does not redirect when authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, loading: false })
    renderHook(() => useRequireAuth())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
