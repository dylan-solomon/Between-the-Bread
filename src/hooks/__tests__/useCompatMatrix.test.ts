import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompatMatrix } from '@/hooks/useCompatMatrix'
import type { CompatMatrixRow } from '@/types'

const { mockFetchCompatMatrix } = vi.hoisted(() => ({
  mockFetchCompatMatrix: vi.fn(),
}))

vi.mock('@/api/compatMatrix', () => ({
  fetchCompatMatrix: mockFetchCompatMatrix,
}))

const stubMatrix: CompatMatrixRow[] = [
  { group_a: 'italian', group_b: 'mediterranean', affinity: 0.85 },
]

beforeEach(() => { mockFetchCompatMatrix.mockReset() })

describe('useCompatMatrix', () => {
  it('starts in loading state with empty matrix', () => {
    mockFetchCompatMatrix.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useCompatMatrix())
    expect(result.current.loading).toBe(true)
    expect(result.current.matrix).toEqual([])
  })

  it('returns matrix after successful fetch', async () => {
    mockFetchCompatMatrix.mockResolvedValue(stubMatrix)
    const { result } = renderHook(() => useCompatMatrix())
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.matrix).toEqual(stubMatrix)
  })

  it('returns empty matrix and sets loading false when fetch fails', async () => {
    mockFetchCompatMatrix.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCompatMatrix())
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.matrix).toEqual([])
  })

  it('calls fetchCompatMatrix once on mount', async () => {
    mockFetchCompatMatrix.mockResolvedValue(stubMatrix)
    renderHook(() => useCompatMatrix())
    await waitFor(() => { expect(mockFetchCompatMatrix).toHaveBeenCalledOnce() })
  })

  it('loading is false after fetch resolves', async () => {
    mockFetchCompatMatrix.mockResolvedValue(stubMatrix)
    const { result } = renderHook(() => useCompatMatrix())
    await waitFor(() => { expect(result.current.loading).toBe(false) })
  })
})
