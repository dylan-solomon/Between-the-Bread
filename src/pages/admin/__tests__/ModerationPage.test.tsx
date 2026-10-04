import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockFetchModerationQueue, mockModerateItem } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchModerationQueue: vi.fn(),
  mockModerateItem: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/admin', () => ({ fetchModerationQueue: mockFetchModerationQueue, moderateItem: mockModerateItem }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import ModerationPage from '@/pages/admin/ModerationPage'
import { accessibilityProblems } from '@/test/accessibility'

const comment1 = { id: 'c1', user_id: 'user-1', target_type: 'database', target_id: 'target-1', parent_id: null, body: 'Flagged comment', is_flagged: true, is_approved: true, created_at: '2026-01-01T00:00:00Z' }
const comment2 = { id: 'c2', user_id: 'user-2', target_type: 'database', target_id: 'target-2', parent_id: null, body: 'Another one', is_flagged: false, is_approved: false, created_at: '2026-01-02T00:00:00Z' }
const photo1 = { id: 'p1', user_id: 'user-3', target_type: 'community', target_id: 'target-3', storage_path: 'user-3/a.jpg', caption: 'Nice', is_approved: false, created_at: '2026-01-03T00:00:00Z' }

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
})

describe('ModerationPage', () => {
  it('loads and renders the comments queue by default', async () => {
    mockFetchModerationQueue.mockResolvedValue([comment1, comment2])
    render(<ModerationPage />)

    await waitFor(() => { expect(screen.getByText('Flagged comment')).toBeInTheDocument() })
    expect(mockFetchModerationQueue).toHaveBeenCalledWith('token-abc', 'comments')
    expect(screen.getByText('Another one')).toBeInTheDocument()
  })

  it('shows an empty state when the queue is empty', async () => {
    mockFetchModerationQueue.mockResolvedValue([])
    render(<ModerationPage />)
    await waitFor(() => { expect(screen.getByText(/nothing pending/i)).toBeInTheDocument() })
  })

  it('switches to the Photos tab and fetches the photos queue', async () => {
    mockFetchModerationQueue.mockResolvedValueOnce([comment1]).mockResolvedValueOnce([photo1])
    render(<ModerationPage />)
    await waitFor(() => { expect(screen.getByText('Flagged comment')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('tab', { name: 'Photos' }))

    await waitFor(() => { expect(screen.getByText('Nice')).toBeInTheDocument() })
    expect(mockFetchModerationQueue).toHaveBeenCalledWith('token-abc', 'photos')
  })

  it('approves an item and removes it from the list', async () => {
    mockFetchModerationQueue.mockResolvedValue([comment1])
    mockModerateItem.mockResolvedValue({})
    render(<ModerationPage />)
    await waitFor(() => { expect(screen.getByText('Flagged comment')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => { expect(screen.queryByText('Flagged comment')).not.toBeInTheDocument() })
    expect(mockModerateItem).toHaveBeenCalledWith('token-abc', 'comments', 'c1', 'approve')
  })

  it('rejects an item and removes it from the list', async () => {
    mockFetchModerationQueue.mockResolvedValue([comment1])
    mockModerateItem.mockResolvedValue({})
    render(<ModerationPage />)
    await waitFor(() => { expect(screen.getByText('Flagged comment')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => { expect(screen.queryByText('Flagged comment')).not.toBeInTheDocument() })
    expect(mockModerateItem).toHaveBeenCalledWith('token-abc', 'comments', 'c1', 'reject')
  })

  it('bulk-approves all selected items via "select all visible"', async () => {
    mockFetchModerationQueue.mockResolvedValue([comment1, comment2])
    mockModerateItem.mockResolvedValue({})
    render(<ModerationPage />)
    await waitFor(() => { expect(screen.getByText('Flagged comment')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('checkbox', { name: /select all visible/i }))
    await userEvent.click(screen.getByRole('button', { name: /approve selected/i }))

    await waitFor(() => { expect(mockModerateItem).toHaveBeenCalledTimes(2) })
    expect(mockModerateItem).toHaveBeenCalledWith('token-abc', 'comments', 'c1', 'approve')
    expect(mockModerateItem).toHaveBeenCalledWith('token-abc', 'comments', 'c2', 'approve')
    await waitFor(() => { expect(toast.success).toHaveBeenCalled() })
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    mockFetchModerationQueue.mockResolvedValue([comment1, comment2])
    render(<ModerationPage />)
    await screen.findByText('Flagged comment')

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
