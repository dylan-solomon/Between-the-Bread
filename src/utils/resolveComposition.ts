import type { CategorySlug, Ingredient, SandwichComposition } from '@/types'

type StoredItem = string | { slug: string; name: string }

const BASE_CATEGORIES: readonly CategorySlug[] = ['bread', 'protein', 'cheese', 'toppings', 'condiments']

const isStoredItem = (item: unknown): item is StoredItem =>
  typeof item === 'string' ||
  (typeof item === 'object' && item !== null && 'slug' in item && typeof (item as { slug: unknown }).slug === 'string')

const extractSlug = (item: StoredItem): string =>
  typeof item === 'string' ? item : item.slug

const findIngredient = (
  slug: string,
  pools: Partial<Record<CategorySlug, Ingredient[]>>,
  category: CategorySlug,
): Ingredient | undefined => {
  const pool = pools[category]
  if (pool === undefined) return undefined
  return pool.find((i) => i.slug === slug)
}

export const resolveComposition = (
  stored: Partial<Record<string, unknown[]>>,
  pools: Partial<Record<CategorySlug, Ingredient[]>>,
): SandwichComposition | null => {
  const result: Partial<SandwichComposition> = {}

  for (const category of BASE_CATEGORIES) {
    const items = stored[category]
    if (items === undefined || items.length === 0) return null

    const resolved: Ingredient[] = []
    for (const item of items) {
      if (!isStoredItem(item)) return null
      const slug = extractSlug(item)
      const ingredient = findIngredient(slug, pools, category)
      if (ingredient === undefined) return null
      resolved.push(ingredient)
    }
    result[category] = resolved
  }

  const chefsSpecial = stored['chefs-special']
  if (chefsSpecial !== undefined && chefsSpecial.length > 0) {
    const resolved: Ingredient[] = []
    for (const item of chefsSpecial) {
      if (!isStoredItem(item)) return null
      const slug = extractSlug(item)
      const ingredient = findIngredient(slug, pools, 'chefs-special')
      if (ingredient === undefined) return null
      resolved.push(ingredient)
    }
    result['chefs-special'] = resolved
  }

  return result as SandwichComposition
}
