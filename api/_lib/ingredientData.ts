const NUTRITION_FIELDS = ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sodium_mg', 'sugar_g'] as const
const COST_FIELDS = ['retail_low', 'retail_high', 'restaurant_low', 'restaurant_high'] as const

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

const hasNonNegativeNumbers = (value: unknown, fields: readonly string[]): boolean => {
  const record = asRecord(value)
  if (record === null) return false
  return fields.every((field) => {
    const entry = record[field]
    return typeof entry === 'number' && Number.isFinite(entry) && entry >= 0
  })
}

export const hasCompleteNutrition = (value: unknown): boolean => hasNonNegativeNumbers(value, NUTRITION_FIELDS)

export const hasCompleteCost = (value: unknown): boolean => {
  const record = asRecord(value)
  if (record === null || !hasNonNegativeNumbers(record, COST_FIELDS)) return false
  return Number(record.retail_low) <= Number(record.retail_high) && Number(record.restaurant_low) <= Number(record.restaurant_high)
}
