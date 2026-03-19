import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SandwichComposition } from '@/types'
import { generateSandwichName } from '@/engine/naming'
import { createShare } from '@/api/shareApi'
import { captureShareLinkCreated, captureShareLinkCopied } from '@/analytics/events'

const NO_CHEESE_SLUG = 'no-cheese'

const buildDescription = (composition: SandwichComposition): string => {
  const chefsSpecial = composition['chefs-special'] ?? []
  const cheese = composition.cheese.filter((i) => i.slug !== NO_CHEESE_SLUG)

  return [
    ...composition.protein,
    ...cheese,
    ...composition.toppings,
    ...composition.condiments,
    ...chefsSpecial,
    ...composition.bread,
  ]
    .map((i) => i.name)
    .join(', ')
}

type Props = {
  composition: SandwichComposition | null
  isRolling?: boolean
}

export default function SummaryCard({ composition, isRolling = false }: Props) {
  const [sharing, setSharing] = useState(false)

  if (composition === null) return null

  const name = generateSandwichName(composition)
  const description = buildDescription(composition)

  const handleShare = async () => {
    setSharing(true)
    try {
      const { hash, url } = await createShare({ composition, name })
      await navigator.clipboard.writeText(url)
      captureShareLinkCreated({ hash, url })
      captureShareLinkCopied({ hash })
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to create share link. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="animate-fade-up text-center">
      <h2 className="font-display text-2xl font-bold text-neutral-900">{name}</h2>
      <p
        data-testid="sandwich-description"
        className="mt-1 text-sm italic text-neutral-500"
      >
        {description}
      </p>
      <button
        type="button"
        onClick={() => { void handleShare() }}
        disabled={sharing || isRolling}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Share2 size={14} />
        Share
      </button>
    </div>
  )
}
