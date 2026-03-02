import type { BaseCategory } from '@/engine/randomizer'
import type { Ingredient, SandwichComposition } from '@/types'

export const buildComposition = (
  baseSelections: Record<BaseCategory, Ingredient[]>,
  chefsSpecial?: Ingredient[],
): SandwichComposition => ({
  ...baseSelections,
  ...(chefsSpecial !== undefined ? { 'chefs-special': chefsSpecial } : {}),
})
