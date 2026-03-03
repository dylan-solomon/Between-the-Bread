import type { CategorySlug, Ingredient, SandwichComposition } from '@/types'

const FLAT_BREAD_SLUGS = new Set(['naan', 'tortilla', 'pita'])
const NO_CHEESE_SLUG = 'no-cheese'

const FILLING_ORDER: CategorySlug[] = [
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

type Layer = { ingredient: Ingredient; slug: CategorySlug; position: 'top' | 'middle' | 'bottom' }

const buildLayers = (composition: SandwichComposition): Layer[] => {
  const breadIngredients = composition.bread
  const isFlat = breadIngredients.some((b) => FLAT_BREAD_SLUGS.has(b.slug))

  const bottomBread: Layer[] = breadIngredients.map((ingredient) => ({
    ingredient, slug: 'bread', position: 'bottom',
  }))
  const fillings: Layer[] = FILLING_ORDER.flatMap((slug) =>
    (composition[slug] ?? [])
      .filter((ingredient) => !(slug === 'cheese' && ingredient.slug === NO_CHEESE_SLUG))
      .map((ingredient) => ({ ingredient, slug, position: 'middle' }))
  )

  if (isFlat) return [...fillings, ...bottomBread]

  const topBread: Layer[] = breadIngredients.map((ingredient) => ({
    ingredient, slug: 'bread', position: 'top',
  }))
  return [...topBread, ...fillings, ...bottomBread]
}

export default function SandwichVisual({ composition }: Props) {
  if (composition === null) {
    return (
      <div className="flex h-48 overflow-hidden items-center justify-center">
        <p className="font-display italic text-neutral-400">
          Roll the dice to build your sandwich…
        </p>
      </div>
    )
  }

  const layers = buildLayers(composition)

  return (
    <div className="flex h-48 overflow-hidden flex-col items-stretch justify-center gap-0.5 px-4">
      {layers.map(({ ingredient, slug, position }) => (
        <div
          key={`${slug}-${position}-${ingredient.slug}`}
          aria-label={ingredient.name}
          className={`w-full rounded border ${LAYER_STYLES[slug]} transition-all`}
        />
      ))}
    </div>
  )
}
