// ─── Primitive unions ────────────────────────────────────────────────────────

export type SelectionType = 'single' | 'multi'

export type CategorySlug =
  | 'bread'
  | 'protein'
  | 'cheese'
  | 'toppings'
  | 'condiments'
  | 'chefs-special'

export type DietaryTag = 'dairy_free' | 'gluten_free' | 'vegan' | 'vegetarian'

export type CompatGroup =
  | 'american'
  | 'asian_fusion'
  | 'deli_classic'
  | 'italian'
  | 'mediterranean'
  | 'neutral'
  | 'southern'
  | 'tex_mex'

// ─── Core data types ─────────────────────────────────────────────────────────

export type Nutrition = {
  calories: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  sodium_mg: number
  sugar_g: number
}

export type EstimatedCost = {
  retail_low: number
  retail_high: number
  restaurant_low: number
  restaurant_high: number
}

export type Category = {
  name: string
  slug: CategorySlug
  display_order: number
  selection_type: SelectionType
  min_picks: number
  max_picks: number
  emoji: string
  color: string
  has_double_toggle: boolean
  is_bonus: boolean
}

export type Ingredient = {
  name: string
  slug: string
  dietary_tags: DietaryTag[]
  compat_group: CompatGroup
  nutrition: Nutrition
  image_asset: string
  is_trigger: boolean
  enabled: boolean
  estimated_cost: EstimatedCost
}

// ─── Composed types ───────────────────────────────────────────────────────────

export type SandwichComposition = {
  bread: Ingredient[]
  protein: Ingredient[]
  cheese: Ingredient[]
  toppings: Ingredient[]
  condiments: Ingredient[]
  'chefs-special'?: Ingredient[]
}

// ─── Root JSON shape (src/data/ingredients.json) ─────────────────────────────

export type IngredientsData = {
  meta: {
    version: string
    date: string
    total_ingredients: number
    categories: number
    cost_data_last_updated: string
  }
  categories: Category[]
  ingredients: Record<CategorySlug, Ingredient[]>
}
