import { useState } from 'react'
import { Star } from 'lucide-react'

const TOOLTIP_LABELS = [
  'Very Poor / Terrible',
  'Below Average / Poor',
  'Average / Satisfactory',
  'Good / Above Average',
  'Excellent / Masterpiece',
]

type Props = {
  value: number | null
  onChange: (rating: number) => void
  disabled?: boolean
}

export default function StarRating({ value, onChange, disabled = false }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const displayValue = hovered ?? value ?? 0

  const groupLabel = value !== null
    ? `Rating: ${String(value)} out of 5`
    : 'Rating: unrated'

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="inline-flex gap-0.5"
      onMouseLeave={() => { setHovered(null) }}
    >
      {TOOLTIP_LABELS.map((label, i) => {
        const starValue = i + 1
        const filled = starValue <= displayValue
        const pluralSuffix = starValue === 1 ? 'star' : 'stars'

        return (
          <button
            key={starValue}
            type="button"
            title={label}
            aria-label={`Rate ${String(starValue)} ${pluralSuffix}: ${label}`}
            data-filled={String(filled)}
            disabled={disabled}
            onClick={() => { onChange(starValue) }}
            onMouseEnter={() => { setHovered(starValue) }}
            className="rounded p-0.5 transition-colors hover:scale-110 disabled:cursor-default disabled:opacity-60"
          >
            <Star
              size={20}
              className={
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-none text-neutral-300'
              }
            />
          </button>
        )
      })}
    </div>
  )
}
