const NUTRITION_FIELDS = ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sodium_mg', 'sugar_g'] as const
const COST_FIELDS = ['retail_low', 'retail_high', 'restaurant_low', 'restaurant_high'] as const

const hasNumbers = (value: unknown, fields: readonly string[]): boolean =>
  typeof value === 'object' &&
  value !== null &&
  fields.every((field) => {
    const entry = (value as Record<string, unknown>)[field]
    return typeof entry === 'number' && Number.isFinite(entry)
  })

export const hasCompleteNutrition = (value: unknown): boolean => hasNumbers(value, NUTRITION_FIELDS)

export const hasCompleteCost = (value: unknown): boolean => hasNumbers(value, COST_FIELDS)
