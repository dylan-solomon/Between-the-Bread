import type { Category, CategorySlug, DoubleCategory, Ingredient } from '@/types'

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
  categories: Category[]
  pools: Record<BaseCategory, Ingredient[]>
  lockedSlugs: ReadonlySet<BaseCategory>
  currentSelections: Partial<Record<BaseCategory, Ingredient[]>>
  doubleCategories: ReadonlySet<DoubleCategory>
}

export const rollCategory = (
  slug: CategorySlug,
  pool: Ingredient[],
  options: { categories: Category[]; count?: number },
): Ingredient[] => {
  if (pool.length === 0) return []

  const category = options.categories.find((c) => c.slug === slug)
  if (!category) return []

  if (options.count !== undefined) {
    const eligiblePool = options.count > 1 ? pool.filter((i) => !i.slug.startsWith('no-')) : pool
    return shuffle(eligiblePool).slice(0, Math.min(options.count, eligiblePool.length))
  }

  if (category.selection_type === 'single') {
    return shuffle(pool).slice(0, 1)
  }

  const finalCount = randomIntInclusive(
    category.min_picks,
    Math.min(category.max_picks, pool.length),
  )
  return shuffle(pool).slice(0, finalCount)
}

export const rollAll = ({
  categories,
  pools,
  lockedSlugs,
  currentSelections,
  doubleCategories,
}: RollAllOptions): Record<BaseCategory, Ingredient[]> =>
  BASE_CATEGORIES.reduce(
    (acc, slug) => {
      if (lockedSlugs.has(slug)) {
        return { ...acc, [slug]: currentSelections[slug] ?? rollCategory(slug, pools[slug], { categories }) }
      }
      const count =
        (slug === 'protein' || slug === 'cheese') && doubleCategories.has(slug) ? 2 : undefined
      return { ...acc, [slug]: rollCategory(slug, pools[slug], { categories, count }) }
    },
    {} as Record<BaseCategory, Ingredient[]>,
  )
