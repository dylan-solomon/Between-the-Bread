import type { SandwichComposition } from '@/types'

export type CostContext = 'retail' | 'restaurant'

export type CostRange = { low: number; high: number }

export const calculateTotalEstimatedCost = (
  composition: SandwichComposition,
  context: CostContext,
): CostRange => {
  const allIngredients = [
    ...composition.bread,
    ...composition.protein,
    ...composition.cheese,
    ...composition.toppings,
    ...composition.condiments,
    ...(composition['chefs-special'] ?? []),
  ]

  const lowKey = context === 'retail' ? 'retail_low' : 'restaurant_low'
  const highKey = context === 'retail' ? 'retail_high' : 'restaurant_high'

  return allIngredients.reduce(
    (acc, ingredient) => ({
      low: acc.low + ingredient.estimated_cost[lowKey],
      high: acc.high + ingredient.estimated_cost[highKey],
    }),
    { low: 0, high: 0 },
  )
}
