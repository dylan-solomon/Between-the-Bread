import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SandwichComposition } from '@/types'
import { generateSandwichName } from '@/engine/naming'
import { createShare } from '@/api/shareApi'
import { captureShareLinkCreated, captureShareLinkCopied, captureCostContextToggled } from '@/analytics/events'
import { calculateTotalEstimatedCost } from '@/utils/cost'
import NutritionPanel from '@/components/NutritionPanel'
import type { CostContext } from '@/utils/cost'

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

const formatDollars = (amount: number): string => `$${amount.toFixed(2)}`

const DISCLAIMER_TEXT: Record<CostContext, string> = {
  retail: 'Per-serving cost at retail (generic to artisanal brands).',
  restaurant: 'Per-serving cost at restaurant/deli (casual to premium).',
}

type Props = {
  composition: SandwichComposition | null
  isRolling?: boolean
  costDataLastUpdated?: string
}

export default function SummaryCard({ composition, isRolling = false, costDataLastUpdated }: Props) {
  const [sharing, setSharing] = useState(false)
  const [costContext, setCostContext] = useState<CostContext>('retail')

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

  const handleContextChange = (context: CostContext) => {
    setCostContext(context)
    captureCostContextToggled({ context })
  }

  const costRange = costDataLastUpdated !== undefined
    ? calculateTotalEstimatedCost(composition, costContext)
    : null

  return (
    <div className="animate-fade-up text-center">
      <h2 className="font-display text-2xl font-bold text-neutral-900">{name}</h2>
      <p
        data-testid="sandwich-description"
        className="mt-1 text-sm italic text-neutral-500"
      >
        {description}
      </p>

      {costRange !== null && costDataLastUpdated !== undefined && (
        <div className="mt-3 space-y-1.5">
          <div className="inline-flex overflow-hidden rounded-full border border-neutral-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => { handleContextChange('retail') }}
              className={`px-3 py-1 transition ${costContext === 'retail' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
            >
              Retail
            </button>
            <button
              type="button"
              onClick={() => { handleContextChange('restaurant') }}
              className={`px-3 py-1 transition ${costContext === 'restaurant' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
            >
              Restaurant
            </button>
          </div>

          <p className="text-sm font-medium text-neutral-700">
            Estimated {costContext} cost: {formatDollars(costRange.low)} – {formatDollars(costRange.high)}
          </p>

          <p
            data-testid="cost-disclaimer"
            className="text-xs text-neutral-400"
          >
            Estimated pricing is approximate. {DISCLAIMER_TEXT[costContext]} Pricing data last updated: {costDataLastUpdated}.
          </p>
        </div>
      )}

      <NutritionPanel composition={composition} />

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
