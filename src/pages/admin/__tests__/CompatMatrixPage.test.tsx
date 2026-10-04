import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockFetchCompatMatrix, mockUpdateCompatMatrix } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchCompatMatrix: vi.fn(),
  mockUpdateCompatMatrix: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/compatMatrix', () => ({ fetchCompatMatrix: mockFetchCompatMatrix }))
vi.mock('@/api/admin', () => ({ updateCompatMatrix: mockUpdateCompatMatrix }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import CompatMatrixPage from '@/pages/admin/CompatMatrixPage'
import { accessibilityProblems } from '@/test/accessibility'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockFetchCompatMatrix.mockResolvedValue([
    { group_a: 'italian', group_b: 'mediterranean', affinity: 0.8 },
    { group_a: 'mediterranean', group_b: 'italian', affinity: 0.8 },
  ])
})

describe('CompatMatrixPage', () => {
  it('renders fetched affinity values in the grid', async () => {
    render(<CompatMatrixPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('italian to mediterranean affinity')).toHaveValue(0.8)
    })
    expect(screen.getByLabelText('mediterranean to italian affinity')).toHaveValue(0.8)
  })

  it('auto-mirrors an edit to the reverse pair', async () => {
    render(<CompatMatrixPage />)
    await waitFor(() => { expect(screen.getByLabelText('italian to mediterranean affinity')).toHaveValue(0.8) })

    const cell = screen.getByLabelText('italian to mediterranean affinity')
    await userEvent.clear(cell)
    await userEvent.type(cell, '0.5')

    expect(screen.getByLabelText('mediterranean to italian affinity')).toHaveValue(0.5)
  })

  it('saves only the changed pairs and shows a success toast', async () => {
    mockUpdateCompatMatrix.mockResolvedValue({ group_a: 'italian', group_b: 'mediterranean', affinity: 0.5 })
    render(<CompatMatrixPage />)
    await waitFor(() => { expect(screen.getByLabelText('italian to mediterranean affinity')).toHaveValue(0.8) })

    const cell = screen.getByLabelText('italian to mediterranean affinity')
    await userEvent.clear(cell)
    await userEvent.type(cell, '0.5')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => { expect(toast.success).toHaveBeenCalled() })
    expect(mockUpdateCompatMatrix).toHaveBeenCalledWith('token-abc', { group_a: 'italian', group_b: 'mediterranean', affinity: 0.5 })
  })

  it('shows an error toast when saving fails', async () => {
    mockUpdateCompatMatrix.mockRejectedValue(new Error('boom'))
    render(<CompatMatrixPage />)
    await waitFor(() => { expect(screen.getByLabelText('italian to mediterranean affinity')).toHaveValue(0.8) })

    const cell = screen.getByLabelText('italian to mediterranean affinity')
    await userEvent.clear(cell)
    await userEvent.type(cell, '0.5')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalled() })
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    render(<CompatMatrixPage />)
    await screen.findByLabelText('italian to mediterranean affinity')

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
