import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const {
  mockUseAuth,
  mockFetchComments,
  mockPostComment,
  mockDeleteComment,
  mockLikeComment,
  mockUnlikeComment,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchComments: vi.fn(),
  mockPostComment: vi.fn(),
  mockDeleteComment: vi.fn(),
  mockLikeComment: vi.fn(),
  mockUnlikeComment: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/context/AuthPromptContext', () => ({ useAuthPrompt: () => ({ prompt: vi.fn() }) }))
vi.mock('@/api/sandwichPage', () => ({
  fetchComments: mockFetchComments,
  postComment: mockPostComment,
  deleteComment: mockDeleteComment,
  likeComment: mockLikeComment,
  unlikeComment: mockUnlikeComment,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import CommentSection from '@/components/sandwich-page/CommentSection'

const loggedInAuth = { user: { id: 'user-1' }, session: { access_token: 'token-abc' } }
const guestAuth = { user: null, session: null }

const makeComment = (overrides: Partial<{ id: string; user_id: string; body: string; like_count: number; reply_count: number; replies: unknown[] }> = {}) => ({
  id: 'c1',
  user_id: 'user-2',
  body: 'Great sandwich!',
  parent_id: null,
  like_count: 0,
  reply_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  replies: [],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(loggedInAuth)
})

describe('CommentSection', () => {
  it('shows a loading state before comments arrive', () => {
    mockFetchComments.mockReturnValue(new Promise(() => {}))
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument()
  })

  it('renders top-level comments with nested replies after loading', async () => {
    mockFetchComments.mockResolvedValue({
      data: [makeComment({ replies: [{ id: 'r1', user_id: 'user-3', body: 'Me too', parent_id: 'c1', like_count: 0, reply_count: 0, created_at: '2026-01-01T00:00:00Z' }] })],
      meta: { total_count: 1, limit: 20, offset: 0 },
    })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('Great sandwich!')).toBeInTheDocument() })
    expect(screen.getByText('Me too')).toBeInTheDocument()
  })

  it('shows an empty state when there are no comments', async () => {
    mockFetchComments.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText(/no comments yet/i)).toBeInTheDocument() })
  })

  it('re-fetches with the selected sort when the sort control changes', async () => {
    mockFetchComments.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)
    await waitFor(() => { expect(mockFetchComments).toHaveBeenCalledTimes(1) })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'best')

    await waitFor(() => {
      expect(mockFetchComments).toHaveBeenLastCalledWith(
        expect.objectContaining({ targetType: 'database', slug: 'reuben', targetId: 'target-1', sort: 'best', offset: 0 }),
      )
    })
  })

  it('shows "Load more" when more comments exist, and fetches the next page on click', async () => {
    mockFetchComments.mockResolvedValue({ data: [makeComment()], meta: { total_count: 5, limit: 1, offset: 0 } })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument() })

    mockFetchComments.mockResolvedValue({ data: [makeComment({ id: 'c2', body: 'Second page' })], meta: { total_count: 5, limit: 1, offset: 1 } })
    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => { expect(screen.getByText('Second page')).toBeInTheDocument() })
    expect(screen.getByText('Great sandwich!')).toBeInTheDocument()
  })

  it('does not show "Load more" once every comment has been loaded', async () => {
    mockFetchComments.mockResolvedValue({ data: [makeComment()], meta: { total_count: 1, limit: 20, offset: 0 } })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('Great sandwich!')).toBeInTheDocument() })
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('prepends a newly posted top-level comment to the list', async () => {
    mockFetchComments.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    mockPostComment.mockResolvedValue({ id: 'new-1', user_id: 'user-1', body: 'Brand new comment', parent_id: null, like_count: 0, reply_count: 0, created_at: '2026-01-02T00:00:00Z' })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText(/no comments yet/i)).toBeInTheDocument() })

    const textareas = screen.getAllByRole('textbox')
    await userEvent.type(textareas[0], 'Brand new comment')
    await userEvent.click(screen.getByRole('button', { name: /post/i }))

    await waitFor(() => { expect(screen.getByText('Brand new comment')).toBeInTheDocument() })
  })

  it('shows a delete button only for the current user\'s own comments', async () => {
    mockFetchComments.mockResolvedValue({
      data: [makeComment({ id: 'mine', user_id: 'user-1', body: 'My comment' }), makeComment({ id: 'theirs', user_id: 'user-2', body: 'Their comment' })],
      meta: { total_count: 2, limit: 20, offset: 0 },
    })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('My comment')).toBeInTheDocument() })
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1)
  })

  it('removes a comment from the list after deleting it', async () => {
    mockFetchComments.mockResolvedValue({
      data: [makeComment({ id: 'mine', user_id: 'user-1', body: 'My comment' })],
      meta: { total_count: 1, limit: 20, offset: 0 },
    })
    mockDeleteComment.mockResolvedValue(undefined)
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('My comment')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => { expect(screen.queryByText('My comment')).not.toBeInTheDocument() })
    expect(mockDeleteComment).toHaveBeenCalledWith('token-abc', { targetType: 'database', slug: 'reuben', id: 'mine' })
  })

  it('shows a reply form when Reply is clicked, and appends the new reply under its parent', async () => {
    mockFetchComments.mockResolvedValue({ data: [makeComment({ id: 'c1' })], meta: { total_count: 1, limit: 20, offset: 0 } })
    mockPostComment.mockResolvedValue({ id: 'r1', user_id: 'user-1', body: 'A reply', parent_id: 'c1', like_count: 0, reply_count: 0, created_at: '2026-01-02T00:00:00Z' })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('Great sandwich!')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /reply/i }))

    const textareas = screen.getAllByRole('textbox')
    await userEvent.type(textareas[textareas.length - 1], 'A reply')
    const postButtons = screen.getAllByRole('button', { name: /post/i })
    await userEvent.click(postButtons[postButtons.length - 1])

    await waitFor(() => { expect(screen.getByText('A reply')).toBeInTheDocument() })
    expect(mockPostComment).toHaveBeenCalledWith('token-abc', expect.objectContaining({ parentId: 'c1' }))
  })

  it('likes a comment and shows the updated count', async () => {
    mockFetchComments.mockResolvedValue({ data: [makeComment({ like_count: 2 })], meta: { total_count: 1, limit: 20, offset: 0 } })
    mockLikeComment.mockResolvedValue({ like_count: 3 })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('Great sandwich!')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /^like/i }))

    await waitFor(() => { expect(screen.getByText('3')).toBeInTheDocument() })
    expect(mockLikeComment).toHaveBeenCalledWith('token-abc', { targetType: 'database', slug: 'reuben', id: 'c1' })
  })

  it('prompts for auth when a guest tries to like a comment', async () => {
    mockUseAuth.mockReturnValue(guestAuth)
    mockFetchComments.mockResolvedValue({ data: [makeComment()], meta: { total_count: 1, limit: 20, offset: 0 } })
    render(<CommentSection targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText('Great sandwich!')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /^like/i }))

    expect(mockLikeComment).not.toHaveBeenCalled()
  })
})
