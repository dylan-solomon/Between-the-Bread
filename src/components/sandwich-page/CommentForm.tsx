import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useAuthPrompt } from '@/context/AuthPromptContext'
import { useUsername } from '@/context/UsernameContext'
import { captureCommentPosted } from '@/analytics/events'
import { postComment } from '@/api/sandwichPage'
import type { Comment, CommentTargetType } from '@/api/sandwichPage'

const MAX_LENGTH = 500

type Props = {
  targetType: CommentTargetType
  slug: string
  targetId: string
  parentId?: string
  onPosted: (comment: Comment) => void
  onCancel?: () => void
}

export default function CommentForm({ targetType, slug, targetId, parentId, onPosted, onCancel }: Props) {
  const { user, session } = useAuth()
  const { prompt } = useAuthPrompt()
  const { needsUsername, askForUsername } = useUsername()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trimmed = body.trim()
  const canSubmit = trimmed !== '' && trimmed.length <= MAX_LENGTH && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return

    if (user === null || session === null) {
      prompt('comment on this sandwich')
      return
    }

    if (needsUsername) {
      askForUsername()
      return
    }

    setSubmitting(true)
    try {
      const comment = await postComment(session.access_token, { targetType, slug, targetId, body: trimmed, parentId })
      onPosted(comment)
      captureCommentPosted({ targetType, slug, isReply: parentId !== undefined })
      setBody('')
    } catch {
      toast.error('Failed to post comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {user !== null && needsUsername && (
        <p className="mb-2 text-sm text-neutral-600">
          Pick a username to post comments.{' '}
          <button type="button" onClick={askForUsername} className="font-medium text-primary underline">
            Choose one
          </button>
        </p>
      )}
      <textarea
        value={body}
        onChange={(e) => { setBody(e.target.value) }}
        maxLength={MAX_LENGTH}
        placeholder="Share your thoughts..."
        rows={3}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-neutral-400">{body.length}/{MAX_LENGTH}</span>
        <div className="flex gap-2">
          {onCancel !== undefined && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => { void handleSubmit() }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
