import type { AdminIngredient } from '@/api/admin'

export type DataField = { key: string; label: string }

export const NUTRITION_FIELDS: DataField[] = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fiber_g', label: 'Fiber (g)' },
  { key: 'sodium_mg', label: 'Sodium (mg)' },
  { key: 'sugar_g', label: 'Sugar (g)' },
]

export const COST_FIELDS: DataField[] = [
  { key: 'retail_low', label: 'Retail low ($)' },
  { key: 'retail_high', label: 'Retail high ($)' },
  { key: 'restaurant_low', label: 'Restaurant low ($)' },
  { key: 'restaurant_high', label: 'Restaurant high ($)' },
]

const hasAll = (record: Record<string, number> | null, fields: DataField[]): boolean =>
  record !== null && fields.every(({ key }) => typeof record[key] === 'number' && Number.isFinite(record[key]))

export const hasCompleteData = (ingredient: AdminIngredient): boolean =>
  hasAll(ingredient.nutrition, NUTRITION_FIELDS) && hasAll(ingredient.estimated_cost, COST_FIELDS)
