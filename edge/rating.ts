const plural = (count: number): string => (count === 1 ? '' : 's')

export const ratingHtml = ({
  avg_rating,
  rating_count,
}: {
  avg_rating: number | null
  rating_count: number
}): string => {
  if (avg_rating === null || rating_count === 0)
    return '<p class="text-sm text-neutral-500">No ratings yet</p>'
  const average = avg_rating.toFixed(1)
  const filled = Math.round(avg_rating)
  const stars = Array.from(
    { length: 5 },
    (_, index) =>
      `<span class="${index < filled ? 'text-amber-400' : 'text-neutral-300'}">★</span>`,
  ).join('')
  return [
    '<div class="flex items-center gap-2">',
    `<div role="img" aria-label="Rated ${average} out of 5 from ${String(rating_count)} rating${plural(rating_count)}" class="flex gap-0.5">${stars}</div>`,
    `<span class="text-sm font-semibold text-neutral-900">${average}</span>`,
    `<span class="text-sm text-neutral-500">(${String(rating_count)} rating${plural(rating_count)})</span>`,
    '</div>',
  ].join('')
}
