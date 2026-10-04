import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useAuthPrompt } from '@/context/AuthPromptContext'
import { captureSandwichRated } from '@/analytics/events'
import { messageFor } from '@/api/errors'
import { submitRating } from '@/api/sandwichPage'
import type { TargetType } from '@/api/sandwichPage'
import StarRating from '@/components/StarRating'

type Props = {
  targetType: TargetType
  slug: string
  targetId: string
}

export default function RatingSubmission({ targetType, slug, targetId }: Props) {
  const { user, session } = useAuth()
  const { prompt } = useAuthPrompt()
  const [myRating, setMyRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = async (score: number) => {
    if (user === null || session === null) {
      prompt('rate this sandwich')
      return
    }

    setSubmitting(true)
    try {
      await submitRating(session.access_token, { targetType, slug, targetId, score })
      setMyRating(score)
      captureSandwichRated({ targetType, slug, score })
      toast.success('Thanks for rating!')
    } catch (error) {
      toast.error(messageFor(error, 'Failed to save your rating. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-neutral-700">Your rating</p>
      <StarRating value={myRating} onChange={(score) => { void handleChange(score) }} disabled={submitting} />
    </div>
  )
}
