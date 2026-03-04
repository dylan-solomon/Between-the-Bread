import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  if (!id) {
    res.status(400).json(err('INVALID_INPUT', 'Ingredient ID is required.', 400))
    return
  }

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
