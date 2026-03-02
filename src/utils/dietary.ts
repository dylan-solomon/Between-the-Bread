import type { DietaryTag, Ingredient } from '@/types'

export const filterByDiet = (ingredients: Ingredient[], activeTags: DietaryTag[]): Ingredient[] => {
  if (activeTags.length === 0) return ingredients
  return ingredients.filter((i) => activeTags.every((tag) => i.dietary_tags.includes(tag)))
}
