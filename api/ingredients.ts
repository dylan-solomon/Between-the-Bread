import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'
import { matchesDiet } from './_lib/dietaryTags.js'

type DbCategory = {
  id: string
  name: string
  slug: string
  display_order: number
  selection_type: string
  min_picks: number
  max_picks: number
  emoji: string | null
  color: string | null
  has_double_toggle: boolean
  is_bonus: boolean
}

type DbIngredient = {
  id: string
  category_id: string
  name: string
  slug: string
  dietary_tags: string[]
  compat_group: string | null
  estimated_cost: Record<string, number> | null
  nutrition: Record<string, number> | null
  image_asset: string | null
  is_trigger: boolean
  enabled: boolean
}

type ApiIngredient = Omit<DbIngredient, 'category_id' | 'enabled'>

type ApiCategory = DbCategory & { ingredients: ApiIngredient[]; hidden_ingredients: ApiIngredient[] }

const toApiIngredient = (ingredient: DbIngredient): ApiIngredient => ({
  id: ingredient.id,
  name: ingredient.name,
  slug: ingredient.slug,
  dietary_tags: ingredient.dietary_tags,
  compat_group: ingredient.compat_group,
  estimated_cost: ingredient.estimated_cost,
  nutrition: ingredient.nutrition,
  image_asset: ingredient.image_asset,
  is_trigger: ingredient.is_trigger,
})

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const dietParam = typeof req.query.diet === 'string' ? req.query.diet : undefined
  const dietFilter = dietParam
    ? dietParam.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const [catResult, ingResult, configResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, display_order, selection_type, min_picks, max_picks, emoji, color, has_double_toggle, is_bonus')
      .order('display_order'),
    supabase
      .from('ingredients')
      .select('id, category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled'),
    supabase
      .from('config')
      .select('value')
      .eq('key', 'cost_data_last_updated')
      .single(),
  ])

  if (catResult.error !== null || ingResult.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch ingredients.', 500))
    return
  }

  const costDataLastUpdated = configResult.error === null
    ? (configResult.data as { value: string }).value
    : null

  const categories = catResult.data as unknown as DbCategory[]
  const allIngredients = ingResult.data as unknown as DbIngredient[]
  const published = allIngredients.filter((i) => i.enabled)
  const hidden = allIngredients.filter((i) => !i.enabled)

  const filtered = dietFilter.length > 0
    ? published.filter((i) => matchesDiet(i.dietary_tags, dietFilter))
    : published

  const groupByCategory = (ingredients: DbIngredient[]): Map<string, ApiIngredient[]> => {
    const byCategory = new Map<string, ApiIngredient[]>()
    for (const ingredient of ingredients) {
      const list = byCategory.get(ingredient.category_id) ?? []
      byCategory.set(ingredient.category_id, [...list, toApiIngredient(ingredient)])
    }
    return byCategory
  }

  const publishedByCategory = groupByCategory(filtered)
  const hiddenByCategory = groupByCategory(hidden)

  const result: ApiCategory[] = categories.map((cat) => ({
    ...cat,
    ingredients: publishedByCategory.get(cat.id) ?? [],
    hidden_ingredients: hiddenByCategory.get(cat.id) ?? [],
  }))

  res.status(200).json(
    ok(
      { categories: result },
      {
        ingredient_count: filtered.length,
        cost_data_last_updated: costDataLastUpdated,
        filters_applied: dietFilter,
      },
    ),
  )
}
