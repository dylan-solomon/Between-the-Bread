import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'

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
}

type ApiIngredient = Omit<DbIngredient, 'category_id'>

type ApiCategory = DbCategory & { ingredients: ApiIngredient[] }

type DbIngredientWithCategory = {
  id: string
  name: string
  slug: string
  dietary_tags: string[]
  compat_group: string | null
  estimated_cost: Record<string, number> | null
  nutrition: Record<string, number> | null
  image_asset: string | null
  is_trigger: boolean
  categories: { id: string; name: string; slug: string }
}

const listIngredients = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
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
      .select('id, category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger')
      .eq('enabled', true),
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

  const filtered = dietFilter.length > 0
    ? allIngredients.filter((i) => dietFilter.every((tag) => i.dietary_tags.includes(tag)))
    : allIngredients

  const byCategory = new Map<string, ApiIngredient[]>()
  for (const { category_id, ...rest } of filtered) {
    const list = byCategory.get(category_id) ?? []
    byCategory.set(category_id, [...list, rest])
  }

  const result: ApiCategory[] = categories.map((cat) => ({
    ...cat,
    ingredients: byCategory.get(cat.id) ?? [],
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

const getIngredientById = async (res: VercelResponse, id: string): Promise<void> => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, categories(id, name, slug)')
    .eq('id', id)
    .single()

  if (error !== null) {
    res.status(404).json(err('INGREDIENT_NOT_FOUND', 'Ingredient not found.', 404))
    return
  }

  const row = data as unknown as DbIngredientWithCategory
  const { categories, ...rest } = row

  res.status(200).json(ok({ ...rest, category: categories }))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { id } = req.query as { id?: string[] }
  const segments = id ?? []

  if (segments.length === 0) {
    await listIngredients(req, res)
    return
  }

  await getIngredientById(res, segments[0])
}
