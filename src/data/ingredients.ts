import type { Category, CategorySlug, Ingredient, IngredientsData } from '@/types'
import rawData from './ingredients.json'

const data = rawData as unknown as IngredientsData

export const getCategories = (): Category[] =>
  [...data.categories].sort((a, b) => a.display_order - b.display_order)

export const getIngredientsByCategory = (slug: CategorySlug): Ingredient[] =>
  data.ingredients[slug]

export const getEnabledIngredients = (slug: CategorySlug): Ingredient[] =>
  getIngredientsByCategory(slug).filter((i) => i.enabled)

export const getIngredientById = (slug: string): Ingredient | undefined =>
  Object.values(data.ingredients).flat().find((i) => i.slug === slug)

export const getTriggerIngredients = (): Ingredient[] =>
  Object.values(data.ingredients)
    .flat()
    .filter((i) => i.is_trigger)
