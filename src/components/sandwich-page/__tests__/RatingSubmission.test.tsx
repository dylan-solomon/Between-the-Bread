import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockPrompt, mockSubmitRating, mockRated } = vi.hoisted(() => ({
  mockRated: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPrompt: vi.fn(),
  mockSubmitRating: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/context/AuthPromptContext', () => ({ useAuthPrompt: () => ({ prompt: mockPrompt }) }))
vi.mock('@/api/sandwichPage', () => ({ submitRating: mockSubmitRating }))
vi.mock('@/analytics/events', () => ({ captureSandwichRated: mockRated }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import RatingSubmission from '@/components/sandwich-page/RatingSubmission'

const guestAuth = { user: null, session: null }
const loggedInAuth = { user: { id: 'user-1' }, session: { access_token: 'token-abc' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RatingSubmission', () => {
  it('renders 5 interactive stars with a "Your rating" label', () => {
    mockUseAuth.mockReturnValue(guestAuth)
    render(<RatingSubmission targetType="database" slug="reuben" targetId="target-1" />)

    expect(screen.getByText('Your rating')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('prompts for auth when a guest clicks a star, without submitting', async () => {
    mockUseAuth.mockReturnValue(guestAuth)
    render(<RatingSubmission targetType="database" slug="reuben" targetId="target-1" />)

    await userEvent.click(screen.getAllByRole('button')[3])

    expect(mockPrompt).toHaveBeenCalledWith('rate this sandwich')
    expect(mockSubmitRating).not.toHaveBeenCalled()
  })

  it('submits the rating when an authenticated user clicks a star', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    mockSubmitRating.mockResolvedValue({ id: 'r1', score: 4 })
    render(<RatingSubmission targetType="database" slug="reuben" targetId="target-1" />)

    await userEvent.click(screen.getAllByRole('button')[3])

    expect(mockSubmitRating).toHaveBeenCalledWith('token-abc', {
      targetType: 'database',
      slug: 'reuben',
      targetId: 'target-1',
      score: 4,
    })
    expect(toast.success).toHaveBeenCalled()
    expect(mockRated).toHaveBeenCalledWith({ targetType: 'database', slug: 'reuben', score: 4 })
  })

  it('shows an error toast when submission fails', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    mockSubmitRating.mockRejectedValue(new Error('boom'))
    render(<RatingSubmission targetType="database" slug="reuben" targetId="target-1" />)

    await userEvent.click(screen.getAllByRole('button')[3])

    expect(toast.error).toHaveBeenCalled()
    expect(mockRated).not.toHaveBeenCalled()
  })
})
