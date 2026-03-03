import type { SandwichComposition } from '@/types'
import { generateSandwichName } from '@/engine/naming'

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
}

export default function SummaryCard({ composition }: Props) {
  if (composition === null) return null

  const name = generateSandwichName(composition)
  const description = buildDescription(composition)

  return (
    <div className="animate-in fade-in text-center">
      <h2 className="font-display text-2xl font-bold text-neutral-900">{name}</h2>
      <p
        data-testid="sandwich-description"
        className="mt-1 text-sm italic text-neutral-500"
      >
        {description}
      </p>
    </div>
  )
}
