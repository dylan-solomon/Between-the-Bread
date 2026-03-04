import type { Category, CategorySlug, Ingredient, SelectionType } from '@/types'

type ApiCategory = {
  id: string
  name: string
  slug: string
  display_order: number
  selection_type: string
  min_picks: number
  max_picks: number
  emoji: string
  color: string
  has_double_toggle: boolean
  is_bonus: boolean
  ingredients: Ingredient[]
}

type ApiResponse = {
  data: { categories: ApiCategory[] }
  meta: { ingredient_count: number; cost_data_last_updated: string; filters_applied: string[] }
}

type FetchIngredientsResult = {
  pools: Record<CategorySlug, Ingredient[]>
  categories: Category[]
}

const ALL_SLUGS: CategorySlug[] = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']

export const fetchIngredients = async (diet?: string[]): Promise<FetchIngredientsResult> => {
  const url = new URL('/api/ingredients', window.location.origin)
  if (diet && diet.length > 0) {
    url.searchParams.set('diet', diet.join(','))
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch ingredients: ${String(response.status)}`)
  }

  const body = (await response.json()) as unknown
  const { data } = body as ApiResponse

  const empty: Record<CategorySlug, Ingredient[]> = Object.fromEntries(
    ALL_SLUGS.map((s) => [s, []]),
  ) as Record<CategorySlug, Ingredient[]>

  const pools = data.categories.reduce(
    (acc, cat) => ({ ...acc, [cat.slug]: cat.ingredients }),
    empty,
  )

  const categories: Category[] = data.categories.map((cat) => ({
    name: cat.name,
    slug: cat.slug as CategorySlug,
    display_order: cat.display_order,
    selection_type: cat.selection_type as SelectionType,
    min_picks: cat.min_picks,
    max_picks: cat.max_picks,
    emoji: cat.emoji,
    color: cat.color,
    has_double_toggle: cat.has_double_toggle,
    is_bonus: cat.is_bonus,
  }))

  return { pools, categories }
}
