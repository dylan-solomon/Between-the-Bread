import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockFetchConfig, mockUpdateConfig } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchConfig: vi.fn(),
  mockUpdateConfig: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/admin', () => ({ fetchConfig: mockFetchConfig, updateConfig: mockUpdateConfig }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import ConfigPage from '@/pages/admin/ConfigPage'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockFetchConfig.mockResolvedValue([
    { key: 'cost_data_last_updated', value: '2026-03-01' },
    { key: 'site_notice', value: null },
  ])
})

describe('ConfigPage', () => {
  it('renders the fetched values into their inputs', async () => {
    render(<ConfigPage />)

    await waitFor(() => { expect(screen.getByLabelText(/cost data last updated/i)).toHaveValue('2026-03-01') })
    expect(screen.getByLabelText(/site notice/i)).toHaveValue('')
  })

  it('saves cost_data_last_updated when its Save button is clicked', async () => {
    mockUpdateConfig.mockResolvedValue({ key: 'cost_data_last_updated', value: '2026-04-01' })
    render(<ConfigPage />)

    await waitFor(() => { expect(screen.getByLabelText(/cost data last updated/i)).toHaveValue('2026-03-01') })
    const dateInput = screen.getByLabelText(/cost data last updated/i)
    await userEvent.clear(dateInput)
    await userEvent.type(dateInput, '2026-04-01')
    await userEvent.click(screen.getByRole('button', { name: /save cost data date/i }))

    await waitFor(() => { expect(toast.success).toHaveBeenCalled() })
    expect(mockUpdateConfig).toHaveBeenCalledWith('token-abc', 'cost_data_last_updated', '2026-04-01')
  })

  it('shows a preview banner once a non-empty site notice is entered', async () => {
    render(<ConfigPage />)
    await waitFor(() => { expect(screen.getByLabelText(/site notice/i)).toBeInTheDocument() })

    await userEvent.type(screen.getByLabelText(/site notice/i), 'We are down for maintenance')

    expect(screen.getByRole('status')).toHaveTextContent('We are down for maintenance')
  })

  it('saves site_notice as null when cleared', async () => {
    mockFetchConfig.mockResolvedValue([
      { key: 'cost_data_last_updated', value: '2026-03-01' },
      { key: 'site_notice', value: 'Old notice' },
    ])
    mockUpdateConfig.mockResolvedValue({ key: 'site_notice', value: null })
    render(<ConfigPage />)

    await waitFor(() => { expect(screen.getByLabelText(/site notice/i)).toHaveValue('Old notice') })
    await userEvent.clear(screen.getByLabelText(/site notice/i))
    await userEvent.click(screen.getByRole('button', { name: /save site notice/i }))

    await waitFor(() => { expect(mockUpdateConfig).toHaveBeenCalledWith('token-abc', 'site_notice', null) })
  })
})
