import { Star } from 'lucide-react'

type Props = {
  avgRating: number | null
  ratingCount: number
}

export default function AggregateRating({ avgRating, ratingCount }: Props) {
  if (avgRating === null || ratingCount === 0) {
    return <p className="text-sm text-neutral-500">No ratings yet</p>
  }

  const filledStars = Math.round(avgRating)
  const label = `Rated ${avgRating.toFixed(1)} out of 5 from ${String(ratingCount)} rating${ratingCount === 1 ? '' : 's'}`

  return (
    <div className="flex items-center gap-2">
      <div role="img" aria-label={label} className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={18}
            className={i < filledStars ? 'fill-amber-400 text-amber-400' : 'fill-none text-neutral-300'}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-neutral-900">{avgRating.toFixed(1)}</span>
      <span className="text-sm text-neutral-500">
        ({ratingCount} rating{ratingCount === 1 ? '' : 's'})
      </span>
    </div>
  )
}
