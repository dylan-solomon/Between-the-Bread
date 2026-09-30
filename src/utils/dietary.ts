import type { DietaryTag, Ingredient } from '@/types'
import { isAvoidTag } from '@/data/dietaryTags'

const satisfies = (ingredient: Ingredient, tag: DietaryTag): boolean =>
  isAvoidTag(tag) ? !ingredient.dietary_tags.includes(tag) : ingredient.dietary_tags.includes(tag)

export const filterByDiet = (ingredients: Ingredient[], activeTags: DietaryTag[]): Ingredient[] => {
  if (activeTags.length === 0) return ingredients
  return ingredients.filter((ingredient) => activeTags.every((tag) => satisfies(ingredient, tag)))
}
