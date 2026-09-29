import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockPrompt, mockPostComment } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockPrompt: vi.fn(),
  mockPostComment: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/context/AuthPromptContext', () => ({ useAuthPrompt: () => ({ prompt: mockPrompt }) }))
vi.mock('@/api/sandwichPage', () => ({ postComment: mockPostComment }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import CommentForm from '@/components/sandwich-page/CommentForm'

const guestAuth = { user: null, session: null }
const loggedInAuth = { user: { id: 'user-1' }, session: { access_token: 'token-abc' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CommentForm', () => {
  it('renders a textarea and a 0/500 character counter', () => {
    mockUseAuth.mockReturnValue(guestAuth)
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('disables submit when the textarea is empty', () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)

    expect(screen.getByRole('button', { name: /post/i })).toBeDisabled()
  })

  it('updates the character counter as the user types', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox'), 'Great sandwich!')
    expect(screen.getByText('15/500')).toBeInTheDocument()
  })

  it('prompts for auth on submit when a guest, without posting', async () => {
    mockUseAuth.mockReturnValue(guestAuth)
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox'), 'Great sandwich!')
    await userEvent.click(screen.getByRole('button', { name: /post/i }))

    expect(mockPrompt).toHaveBeenCalledWith('comment on this sandwich')
    expect(mockPostComment).not.toHaveBeenCalled()
  })

  it('posts the comment and calls onPosted when authenticated', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    const created = { id: 'c1', user_id: 'user-1', body: 'Great sandwich!', parent_id: null, like_count: 0, reply_count: 0, created_at: '2026-01-01T00:00:00Z' }
    mockPostComment.mockResolvedValue(created)
    const onPosted = vi.fn()

    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={onPosted} />)
    await userEvent.type(screen.getByRole('textbox'), 'Great sandwich!')
    await userEvent.click(screen.getByRole('button', { name: /post/i }))

    expect(mockPostComment).toHaveBeenCalledWith('token-abc', {
      targetType: 'database',
      slug: 'reuben',
      targetId: 'target-1',
      body: 'Great sandwich!',
      parentId: undefined,
    })
    expect(onPosted).toHaveBeenCalledWith(created)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('passes parentId through when replying', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    mockPostComment.mockResolvedValue({ id: 'r1', user_id: 'user-1', body: 'Me too', parent_id: 'c1', like_count: 0, reply_count: 0, created_at: '2026-01-01T00:00:00Z' })

    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" parentId="c1" onPosted={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'Me too')
    await userEvent.click(screen.getByRole('button', { name: /post/i }))

    expect(mockPostComment).toHaveBeenCalledWith('token-abc', expect.objectContaining({ parentId: 'c1' }))
  })

  it('shows an error toast when posting fails', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    mockPostComment.mockRejectedValue(new Error('boom'))

    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'Great sandwich!')
    await userEvent.click(screen.getByRole('button', { name: /post/i }))

    expect(toast.error).toHaveBeenCalled()
  })

  it('shows a cancel button only when onCancel is provided, and calls it when clicked', async () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    const onCancel = vi.fn()
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not render a cancel button when onCancel is not provided', () => {
    mockUseAuth.mockReturnValue(loggedInAuth)
    render(<CommentForm targetType="database" slug="reuben" targetId="target-1" onPosted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })
})
