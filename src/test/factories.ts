import type { Ingredient, SandwichComposition } from '@/types'

export const makeIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  name: 'Test Ingredient',
  slug: 'test-ingredient',
  dietary_tags: [],
  compat_group: 'neutral',
  nutrition: {
    calories: 100,
    protein_g: 5,
    fat_g: 3,
    carbs_g: 10,
    fiber_g: 1,
    sodium_mg: 100,
    sugar_g: 2,
  },
  image_asset: '/assets/test.png',
  is_trigger: false,
  enabled: true,
  estimated_cost: { retail_low: 0.5, retail_high: 1.0, restaurant_low: 1.0, restaurant_high: 2.0 },
  ...overrides,
})

export const makePool = (count: number, slugPrefix = 'item'): Ingredient[] =>
  Array.from({ length: count }, (_, i) =>
    makeIngredient({ name: `${slugPrefix}-${i}`, slug: `${slugPrefix}-${i}` }),
  )

export const makeComposition = (overrides: Partial<SandwichComposition> = {}): SandwichComposition => ({
  bread: [makeIngredient({ name: 'Sourdough', slug: 'sourdough' })],
  protein: [makeIngredient({ name: 'Turkey', slug: 'turkey' })],
  cheese: [makeIngredient({ name: 'Swiss', slug: 'swiss' })],
  toppings: [makeIngredient({ name: 'Lettuce', slug: 'lettuce' })],
  condiments: [makeIngredient({ name: 'Mayo', slug: 'mayo' })],
  ...overrides,
})
