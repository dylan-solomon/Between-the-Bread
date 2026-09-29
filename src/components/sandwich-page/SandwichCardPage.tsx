import type { ReactNode } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TargetType } from '@/api/sandwichPage'
import AggregateRating from '@/components/sandwich-page/AggregateRating'
import RatingSubmission from '@/components/sandwich-page/RatingSubmission'
import CommentSection from '@/components/sandwich-page/CommentSection'
import PhotoGallery from '@/components/sandwich-page/PhotoGallery'

type Props = {
  targetType: TargetType
  slug: string
  targetId: string
  name: string
  funName?: string
  avgRating: number | null
  ratingCount: number
  heroVisual: ReactNode
  infoSection: ReactNode
  actionBar?: ReactNode
}

export default function SandwichCardPage({
  targetType,
  slug,
  targetId,
  name,
  funName,
  avgRating,
  ratingCount,
  heroVisual,
  infoSection,
  actionBar,
}: Props) {
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-neutral-900">{funName ?? name}</h1>
        {funName !== undefined && (
          <p data-testid="fun-name" className="mt-1 font-display text-lg italic text-neutral-500">
            {name}
          </p>
        )}
      </div>

      <div className="mt-6">{heroVisual}</div>

      <div className="mt-4 flex justify-center">
        <AggregateRating avgRating={avgRating} ratingCount={ratingCount} />
      </div>

      <div className="mt-8">{infoSection}</div>

      <div className="mt-8 border-t border-neutral-200 pt-6">
        <RatingSubmission targetType={targetType} slug={slug} targetId={targetId} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void handleShare() }}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <Share2 size={14} />
          Share
        </button>
        {actionBar}
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-8">
        <CommentSection targetType={targetType} slug={slug} targetId={targetId} />
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-8">
        <PhotoGallery targetType={targetType} slug={slug} targetId={targetId} />
      </div>
    </div>
  )
}
