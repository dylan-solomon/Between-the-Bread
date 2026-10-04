import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

const { mockUseAuth, mockFetchDashboardMetrics } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchDashboardMetrics: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/admin', () => ({ fetchDashboardMetrics: mockFetchDashboardMetrics }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import DashboardPage from '@/pages/admin/DashboardPage'
import { accessibilityProblems } from '@/test/accessibility'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
})

describe('DashboardPage', () => {
  it('shows a loading state before metrics arrive', () => {
    mockFetchDashboardMetrics.mockReturnValue(new Promise(() => {}))
    render(<DashboardPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders the fetched metrics', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      total_users: 10,
      total_saved_sandwiches: 25,
      total_shared_links: 5,
      total_ratings: 40,
      pending_moderation_count: 3,
    })
    render(<DashboardPage />)

    await waitFor(() => { expect(screen.getByText('10')).toBeInTheDocument() })
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows an error toast when the fetch fails', async () => {
    mockFetchDashboardMetrics.mockRejectedValue(new Error('boom'))
    render(<DashboardPage />)

    await waitFor(() => { expect(toast.error).toHaveBeenCalled() })
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      total_users: 10,
      total_saved_sandwiches: 25,
      total_shared_links: 5,
      total_ratings: 40,
      pending_moderation_count: 3,
    })
    render(<DashboardPage />)
    await screen.findByText('10')

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
