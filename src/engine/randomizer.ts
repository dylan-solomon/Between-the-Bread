import type { CategorySlug, Ingredient } from '@/types'
import { getCategories } from '@/data/ingredients'

// ─── Internal utilities ───────────────────────────────────────────────────────

const shuffle = <T>(arr: readonly T[]): T[] => {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

const randomIntInclusive = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

// ─── Public API ───────────────────────────────────────────────────────────────

export type BaseCategory = Exclude<CategorySlug, 'chefs-special'>

export const BASE_CATEGORIES: BaseCategory[] = [
  'bread',
  'protein',
  'cheese',
  'toppings',
  'condiments',
]

export type RollAllOptions = {
  pools: Record<BaseCategory, Ingredient[]>
  lockedSlugs: ReadonlySet<BaseCategory>
  currentSelections: Partial<Record<BaseCategory, Ingredient[]>>
}

export const rollCategory = (slug: CategorySlug, pool: Ingredient[]): Ingredient[] => {
  if (pool.length === 0) return []

  const category = getCategories().find((c) => c.slug === slug)
  if (!category) return []

  if (category.selection_type === 'single') {
    return shuffle(pool).slice(0, 1)
  }

  const count = randomIntInclusive(
    category.min_picks,
    Math.min(category.max_picks, pool.length),
  )
  return shuffle(pool).slice(0, count)
}

export const rollAll = ({
  pools,
  lockedSlugs,
  currentSelections,
}: RollAllOptions): Record<BaseCategory, Ingredient[]> =>
  BASE_CATEGORIES.reduce(
    (acc, slug) => {
      if (lockedSlugs.has(slug)) {
        return { ...acc, [slug]: currentSelections[slug] ?? rollCategory(slug, pools[slug]) }
      }
      return { ...acc, [slug]: rollCategory(slug, pools[slug]) }
    },
    {} as Record<BaseCategory, Ingredient[]>,
  )
