import type { CategorySlug, Ingredient } from '@/types'

const FLAT_BREAD_SLUGS = new Set(['naan', 'tortilla', 'pita'])
const NO_CHEESE_SLUG = 'no-cheese'

const FILLING_ORDER: CategorySlug[] = [
  'condiments',
  'chefs-special',
  'toppings',
  'cheese',
  'protein',
]

type Size = 'regular' | 'compact'

const LAYER_COLORS: Record<CategorySlug, string> = {
  bread:           'bg-bread-light border-bread rounded-full',
  protein:         'bg-protein-light border-protein',
  cheese:          'bg-cheese-light border-cheese',
  toppings:        'bg-toppings-light border-toppings',
  condiments:      'bg-condiments-light border-condiments',
  'chefs-special': 'bg-chefs-special-light border-chefs-special',
}

const LAYER_HEIGHTS: Record<Size, Record<CategorySlug, string>> = {
  regular: { bread: 'h-5', protein: 'h-4', cheese: 'h-3', toppings: 'h-3', condiments: 'h-2', 'chefs-special': 'h-3' },
  compact: { bread: 'h-3', protein: 'h-2.5', cheese: 'h-2', toppings: 'h-2', condiments: 'h-1.5', 'chefs-special': 'h-2' },
}

const CONTAINER_CLASSES: Record<Size, string> = {
  regular: 'flex h-48 overflow-hidden flex-col items-stretch justify-center gap-0.5 px-4',
  compact: 'flex h-24 overflow-hidden flex-col items-stretch justify-center gap-px px-6',
}

type VisualIngredient = Pick<Ingredient, 'slug' | 'name'>

export type VisualComposition = { bread: VisualIngredient[] } & Partial<Record<Exclude<CategorySlug, 'bread'>, VisualIngredient[]>>

type Props = {
  composition: VisualComposition | null
  size?: Size
}

type Layer = { ingredient: VisualIngredient; slug: CategorySlug; position: 'top' | 'middle' | 'bottom' }

const buildLayers = (composition: VisualComposition): Layer[] => {
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

export default function SandwichVisual({ composition, size = 'regular' }: Props) {
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
    <div className={CONTAINER_CLASSES[size]}>
      {layers.map(({ ingredient, slug, position }) => (
        <div
          key={`${slug}-${position}-${ingredient.slug}`}
          aria-label={ingredient.name}
          className={`w-full rounded border ${size === 'regular' ? 'animate-spring-in' : ''} ${LAYER_COLORS[slug]} ${LAYER_HEIGHTS[size][slug]}`}
        />
      ))}
    </div>
  )
}
