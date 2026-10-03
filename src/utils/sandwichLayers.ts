import type { CategorySlug, Ingredient } from '../types'

export type LayerSize = 'regular' | 'compact'

type VisualIngredient = Pick<Ingredient, 'slug' | 'name'>

export type VisualComposition = { bread: VisualIngredient[] } & Partial<
  Record<Exclude<CategorySlug, 'bread'>, VisualIngredient[]>
>

export type SandwichLayer = { key: string; label: string; className: string }

const FLAT_BREAD_SLUGS = new Set(['naan', 'tortilla', 'pita'])
const NO_CHEESE_SLUG = 'no-cheese'

const FILLING_ORDER: CategorySlug[] = ['condiments', 'chefs-special', 'toppings', 'cheese', 'protein']

const LAYER_COLORS: Record<CategorySlug, string> = {
  bread: 'bg-bread-light border-bread rounded-full',
  protein: 'bg-protein-light border-protein',
  cheese: 'bg-cheese-light border-cheese',
  toppings: 'bg-toppings-light border-toppings',
  condiments: 'bg-condiments-light border-condiments',
  'chefs-special': 'bg-chefs-special-light border-chefs-special',
}

const LAYER_HEIGHTS: Record<LayerSize, Record<CategorySlug, string>> = {
  regular: { bread: 'h-5', protein: 'h-4', cheese: 'h-3', toppings: 'h-3', condiments: 'h-2', 'chefs-special': 'h-3' },
  compact: { bread: 'h-3', protein: 'h-2.5', cheese: 'h-2', toppings: 'h-2', condiments: 'h-1.5', 'chefs-special': 'h-2' },
}

export const SANDWICH_CONTAINER_CLASSES: Record<LayerSize, string> = {
  regular: 'flex h-48 overflow-hidden flex-col items-stretch justify-center gap-0.5 px-4',
  compact: 'flex h-24 overflow-hidden flex-col items-stretch justify-center gap-px px-6',
}

type Placed = { ingredient: VisualIngredient; slug: CategorySlug; position: 'top' | 'middle' | 'bottom' }

const place = (composition: VisualComposition): Placed[] => {
  const bread = composition.bread
  const isFlat = bread.some((item) => FLAT_BREAD_SLUGS.has(item.slug))
  const bottom: Placed[] = bread.map((ingredient) => ({ ingredient, slug: 'bread', position: 'bottom' }))
  const fillings: Placed[] = FILLING_ORDER.flatMap((slug) =>
    (composition[slug] ?? [])
      .filter((ingredient) => !(slug === 'cheese' && ingredient.slug === NO_CHEESE_SLUG))
      .map((ingredient) => ({ ingredient, slug, position: 'middle' as const })),
  )
  if (isFlat) return [...fillings, ...bottom]
  const top: Placed[] = bread.map((ingredient) => ({ ingredient, slug: 'bread', position: 'top' }))
  return [...top, ...fillings, ...bottom]
}

export const sandwichLayers = ({
  composition,
  size,
  animate,
}: {
  composition: VisualComposition
  size: LayerSize
  animate: boolean
}): SandwichLayer[] =>
  place(composition).map(({ ingredient, slug, position }) => ({
    key: `${slug}-${position}-${ingredient.slug}`,
    label: ingredient.name,
    className: ['w-full rounded border', animate ? 'animate-spring-in' : '', LAYER_COLORS[slug], LAYER_HEIGHTS[size][slug]]
      .filter((part) => part !== '')
      .join(' '),
  }))

type LooseComposition = Partial<Record<string, unknown[]>>

const isVisualIngredient = (value: unknown): value is VisualIngredient =>
  typeof value === 'object' &&
  value !== null &&
  'slug' in value &&
  typeof value.slug === 'string' &&
  'name' in value &&
  typeof value.name === 'string'

const itemsOf = (composition: LooseComposition, category: CategorySlug): VisualIngredient[] =>
  (composition[category] ?? []).filter(isVisualIngredient)

export const toVisualComposition = (composition: LooseComposition): VisualComposition => ({
  bread: itemsOf(composition, 'bread'),
  protein: itemsOf(composition, 'protein'),
  cheese: itemsOf(composition, 'cheese'),
  toppings: itemsOf(composition, 'toppings'),
  condiments: itemsOf(composition, 'condiments'),
  'chefs-special': itemsOf(composition, 'chefs-special'),
})
