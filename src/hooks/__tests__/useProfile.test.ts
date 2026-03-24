import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}))

import { useProfile } from '@/hooks/useProfile'

const profileData = {
  display_name: 'SandwichFan',
  dietary_filters: ['vegetarian'],
  smart_mode_default: true,
  double_protein: false,
  double_cheese: true,
  cost_context: 'retail',
}

beforeEach(() => {
  mockFetch.mockReset()
  mockUseAuth.mockReset()
})

describe('useProfile', () => {
  it('returns null profile when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false })
    const { result } = renderHook(() => useProfile())
    expect(result.current.profile).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('returns null profile while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: true })
    const { result } = renderHook(() => useProfile())
    expect(result.current.profile).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('fetches profile when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      session: { access_token: 'token-abc' },
      loading: false,
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { profile: profileData } }),
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual(profileData)
    expect(mockFetch).toHaveBeenCalledWith('/api/profile', {
      headers: { Authorization: 'Bearer token-abc' },
    })
  })

  it('returns null profile when fetch fails', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      session: { access_token: 'token-abc' },
      loading: false,
    })
    mockFetch.mockResolvedValue({ ok: false })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
  })
})
