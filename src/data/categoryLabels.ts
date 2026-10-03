import type { CategorySlug } from '../types'

export const CATEGORY_ORDER: CategorySlug[] = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  bread: 'Bread',
  protein: 'Protein',
  cheese: 'Cheese',
  toppings: 'Toppings',
  condiments: 'Condiments',
  'chefs-special': "Chef's Special",
}
