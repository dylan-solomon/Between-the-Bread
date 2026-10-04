import { useCallback, useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useAuthPrompt } from '@/context/AuthPromptContext'
import { deleteComment, fetchComments, likeComment, unlikeComment } from '@/api/sandwichPage'
import type { Comment, CommentSort, CommentTargetType, CommentWithReplies } from '@/api/sandwichPage'
import CommentForm from '@/components/sandwich-page/CommentForm'
import AuthorName from '@/components/AuthorName'

const PAGE_SIZE = 20

const SORT_OPTIONS: { value: CommentSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'best', label: 'Best' },
  { value: 'hot', label: 'Hot' },
]

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

type Props = {
  targetType: CommentTargetType
  slug: string
  targetId: string
}

export default function CommentSection({ targetType, slug, targetId }: Props) {
  const { user, session } = useAuth()
  const { prompt } = useAuthPrompt()
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<CommentSort>('newest')
  const [totalCount, setTotalCount] = useState(0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async (nextOffset: number, append: boolean) => {
    setLoading(true)
    try {
      const result = await fetchComments({ targetType, slug, targetId, sort, limit: PAGE_SIZE, offset: nextOffset })
      setComments((prev) => (append ? [...prev, ...result.data] : result.data))
      setTotalCount(result.meta.total_count)
    } catch {
      toast.error('Failed to load comments.')
    } finally {
      setLoading(false)
    }
  }, [targetType, slug, targetId, sort])

  useEffect(() => {
    void load(0, false)
  }, [load])

  const handleLoadMore = () => {
    void load(comments.length, true)
  }

  const updateCommentLikeCount = (id: string, likeCount: number) => {
    setComments((prev) => prev.map((c) => (
      c.id === id
        ? { ...c, like_count: likeCount }
        : { ...c, replies: c.replies.map((r) => (r.id === id ? { ...r, like_count: likeCount } : r)) }
    )))
  }

  const handleToggleLike = async (comment: Comment) => {
    if (user === null || session === null) {
      prompt('like this comment')
      return
    }

    const alreadyLiked = likedIds.has(comment.id)
    try {
      const result = alreadyLiked
        ? await unlikeComment(session.access_token, { targetType, slug, id: comment.id })
        : await likeComment(session.access_token, { targetType, slug, id: comment.id })
      updateCommentLikeCount(comment.id, result.like_count)
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (alreadyLiked) next.delete(comment.id)
        else next.add(comment.id)
        return next
      })
    } catch {
      toast.error('Failed to update like.')
    }
  }

  const handleDelete = async (comment: Comment) => {
    if (session === null) return
    try {
      await deleteComment(session.access_token, { targetType, slug, id: comment.id })
      setComments((prev) => prev
        .filter((c) => c.id !== comment.id)
        .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== comment.id) })))
      setTotalCount((prev) => (comment.parent_id === null ? prev - 1 : prev))
    } catch {
      toast.error('Failed to delete comment.')
    }
  }

  const renderActions = (comment: Comment) => (
    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
      <button
        type="button"
        aria-label={likedIds.has(comment.id) ? 'Unlike' : 'Like'}
        onClick={() => { void handleToggleLike(comment) }}
        className="flex items-center gap-1 transition hover:text-primary"
      >
        <ThumbsUp size={14} className={likedIds.has(comment.id) ? 'fill-primary text-primary' : ''} />
        <span>{comment.like_count}</span>
      </button>
      {comment.parent_id === null && (
        <button type="button" onClick={() => { setReplyingTo(comment.id) }} className="transition hover:text-primary">
          Reply
        </button>
      )}
      {user !== null && comment.user_id === user.id && (
        <button type="button" aria-label="Delete" onClick={() => { void handleDelete(comment) }} className="transition hover:text-red-600">
          Delete
        </button>
      )}
    </div>
  )

  const hasMore = comments.length < totalCount

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Comments</h2>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600">
          <span className="sr-only">Sort comments</span>
          <select
            aria-label="Sort comments"
            value={sort}
            onChange={(e) => { setSort(e.target.value as CommentSort) }}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <CommentForm
          targetType={targetType}
          slug={slug}
          targetId={targetId}
          onPosted={(comment) => {
            setComments((prev) => [{ ...comment, replies: [] }, ...prev])
            setTotalCount((prev) => prev + 1)
          }}
        />
      </div>

      {loading && comments.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">Loading comments...</p>
      )}

      {!loading && comments.length === 0 && (
        <p className="mt-6 text-center text-sm text-neutral-500">No comments yet — be the first to share your thoughts!</p>
      )}

      {comments.length > 0 && (
        <ul className="mt-4 divide-y divide-neutral-200">
          {comments.map((comment) => (
            <li key={comment.id} className="py-3">
              <AuthorName username={comment.username} isAdmin={comment.author_is_admin} />
              <p className="text-xs text-neutral-500">{formatDate(comment.created_at)}</p>
              <p className="mt-1 text-sm text-neutral-700">{comment.body}</p>
              {renderActions(comment)}

              {replyingTo === comment.id && (
                <div className="mt-2 ml-4">
                  <CommentForm
                    targetType={targetType}
                    slug={slug}
                    targetId={targetId}
                    parentId={comment.id}
                    onCancel={() => { setReplyingTo(null) }}
                    onPosted={(reply) => {
                      setComments((prev) => prev.map((c) => (
                        c.id === comment.id ? { ...c, replies: [...c.replies, reply] } : c
                      )))
                      setReplyingTo(null)
                    }}
                  />
                </div>
              )}

              {comment.replies.length > 0 && (
                <ul className="mt-2 ml-4 space-y-3 border-l border-neutral-200 pl-3">
                  {comment.replies.map((reply) => (
                    <li key={reply.id}>
                      <AuthorName username={reply.username} isAdmin={reply.author_is_admin} />
                      <p className="text-xs text-neutral-500">{formatDate(reply.created_at)}</p>
                      <p className="mt-1 text-sm text-neutral-700">{reply.body}</p>
                      {renderActions(reply)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
