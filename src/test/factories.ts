import type { Category, CategorySlug, Ingredient, SandwichComposition } from '@/types'

export const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  name: 'Test Category',
  slug: 'bread' as CategorySlug,
  display_order: 1,
  selection_type: 'single',
  min_picks: 1,
  max_picks: 1,
  emoji: '🍞',
  color: '#D4A056',
  has_double_toggle: false,
  is_bonus: false,
  ...overrides,
})

export const makeCategories = (): Category[] => [
  makeCategory({ name: 'Bread',          slug: 'bread',         selection_type: 'single', min_picks: 1, max_picks: 1, display_order: 1, emoji: '🍞',    color: '#D4A056' }),
  makeCategory({ name: 'Protein',        slug: 'protein',       selection_type: 'single', min_picks: 1, max_picks: 1, display_order: 2, emoji: '🥩',    color: '#C0392B', has_double_toggle: true }),
  makeCategory({ name: 'Cheese',         slug: 'cheese',        selection_type: 'single', min_picks: 1, max_picks: 1, display_order: 3, emoji: '🧀',    color: '#F0C040', has_double_toggle: true }),
  makeCategory({ name: 'Toppings',       slug: 'toppings',      selection_type: 'multi',  min_picks: 1, max_picks: 4, display_order: 4, emoji: '🥬',    color: '#27AE60' }),
  makeCategory({ name: 'Condiments',     slug: 'condiments',    selection_type: 'multi',  min_picks: 1, max_picks: 2, display_order: 5, emoji: '🫙',    color: '#E67E22' }),
  makeCategory({ name: "Chef's Special", slug: 'chefs-special', selection_type: 'single', min_picks: 1, max_picks: 1, display_order: 6, emoji: '👨‍🍳', color: '#8E44AD', is_bonus: true }),
]

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
    makeIngredient({ name: `${slugPrefix}-${String(i)}`, slug: `${slugPrefix}-${String(i)}` }),
  )

export const makeComposition = (overrides: Partial<SandwichComposition> = {}): SandwichComposition => ({
  bread: [makeIngredient({ name: 'Sourdough', slug: 'sourdough' })],
  protein: [makeIngredient({ name: 'Turkey', slug: 'turkey' })],
  cheese: [makeIngredient({ name: 'Swiss', slug: 'swiss' })],
  toppings: [makeIngredient({ name: 'Lettuce', slug: 'lettuce' })],
  condiments: [makeIngredient({ name: 'Mayo', slug: 'mayo' })],
  ...overrides,
})
