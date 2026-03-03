import type { CategorySlug, Ingredient, SandwichComposition } from '@/types'

// Category display order for stacking (bottom to top: bread → condiments → toppings → cheese → protein → bread top)
// We show bottom-bread first, then fillings, then top
const LAYER_ORDER: CategorySlug[] = [
  'bread',
  'condiments',
  'chefs-special',
  'toppings',
  'cheese',
  'protein',
]

const LAYER_STYLES: Record<CategorySlug, string> = {
  bread:           'bg-bread-light border-bread h-5 rounded-full',
  protein:         'bg-protein-light border-protein h-4',
  cheese:          'bg-cheese-light border-cheese h-3',
  toppings:        'bg-toppings-light border-toppings h-3',
  condiments:      'bg-condiments-light border-condiments h-2',
  'chefs-special': 'bg-chefs-special-light border-chefs-special h-3',
}

type Props = {
  composition: SandwichComposition | null
}

type Layer = { ingredient: Ingredient; slug: CategorySlug }

const buildLayers = (composition: SandwichComposition): Layer[] =>
  LAYER_ORDER.flatMap((slug) => {
    const ingredients = composition[slug] ?? []
    return ingredients.map((ingredient) => ({ ingredient, slug }))
  })

export default function SandwichVisual({ composition }: Props) {
  if (composition === null) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-display italic text-neutral-400">
          Roll the dice to build your sandwich…
        </p>
      </div>
    )
  }

  const layers = buildLayers(composition)

  return (
    <div className="flex h-48 flex-col items-stretch justify-center gap-0.5 px-4">
      {layers.map(({ ingredient, slug }) => (
        <div
          key={`${slug}-${ingredient.slug}`}
          aria-label={ingredient.name}
          className={`w-full rounded border ${LAYER_STYLES[slug]} transition-all`}
        />
      ))}
    </div>
  )
}
