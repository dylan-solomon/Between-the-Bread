import { describe, it, expect } from 'vitest'
import {
  getCategories,
  getIngredientsByCategory,
  getEnabledIngredients,
  getIngredientById,
  getTriggerIngredients,
} from '@/data/ingredients'
import { COST_FIELDS, NUTRITION_FIELDS } from '@/utils/ingredientData'
import type { CategorySlug } from '@/types'

describe('getCategories', () => {
  it('returns all 6 categories', () => {
    expect(getCategories()).toHaveLength(6)
  })

  it('returns categories ordered by display_order', () => {
    const orders = getCategories().map((c) => c.display_order)
    expect(orders).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('returns categories with correct slugs in order', () => {
    const slugs = getCategories().map((c) => c.slug)
    expect(slugs).toEqual([
      'bread',
      'protein',
      'cheese',
      'toppings',
      'condiments',
      'chefs-special',
    ])
  })
})

describe('getIngredientsByCategory', () => {
  it('returns 27 bread ingredients', () => {
    expect(getIngredientsByCategory('bread')).toHaveLength(27)
  })

  it('returns 34 protein ingredients', () => {
    expect(getIngredientsByCategory('protein')).toHaveLength(34)
  })

  it('returns 23 cheese ingredients', () => {
    expect(getIngredientsByCategory('cheese')).toHaveLength(23)
  })

  it('returns 33 toppings ingredients', () => {
    expect(getIngredientsByCategory('toppings')).toHaveLength(33)
  })

  it('returns 35 condiments ingredients', () => {
    expect(getIngredientsByCategory('condiments')).toHaveLength(35)
  })

  it("returns 15 chef's special ingredients", () => {
    expect(getIngredientsByCategory('chefs-special')).toHaveLength(15)
  })
})

describe('getEnabledIngredients', () => {
  it('returns only ingredients where enabled is true', () => {
    const enabled = getEnabledIngredients('bread')
    expect(enabled.every((i) => i.enabled)).toBe(true)
  })

  it('returns 17 enabled bread ingredients', () => {
    expect(getEnabledIngredients('bread')).toHaveLength(17)
  })
})

describe('getIngredientById', () => {
  it('returns the correct ingredient for a known slug', () => {
    const ingredient = getIngredientById('sourdough')
    expect(ingredient?.name).toBe('Sourdough')
    expect(ingredient?.slug).toBe('sourdough')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getIngredientById('unicorn-bread')).toBeUndefined()
  })
})

describe('getTriggerIngredients', () => {
  it('returns exactly 2 trigger ingredients', () => {
    expect(getTriggerIngredients()).toHaveLength(2)
  })

  it('returns only ingredients where is_trigger is true', () => {
    expect(getTriggerIngredients().every((i) => i.is_trigger)).toBe(true)
  })

  describe('ingredients kept out of the randomizer', () => {
    it('are listed in the data but disabled', () => {
      const hidden = getIngredientsByCategory('bread').filter((i) => !i.enabled).map((i) => i.slug)

      expect(hidden).toEqual([
        'pain-de-mie', 'cuban-bread', 'hoagie-roll', 'french-roll', 'hamburger-bun', 'kaiser-roll',
        'french-bread', 'muffuletta-bread', 'hot-dog-bun', 'kummelweck-roll',
      ])
    })

    it('are left out of the enabled ingredients', () => {
      const enabled = getEnabledIngredients('bread').map((i) => i.slug)

      expect(enabled).toHaveLength(17)
      expect(enabled).not.toContain('pain-de-mie')
      expect(enabled).not.toContain('cuban-bread')
      expect(enabled).not.toContain('hoagie-roll')
    })

    it('are exactly the ingredients used by encyclopedia sandwiches that the randomizer lacks', () => {
      const hiddenSlugs = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']
        .flatMap((slug) => getIngredientsByCategory(slug as CategorySlug))
        .filter((i) => !i.enabled)
        .map((i) => i.slug)
        .sort()

      expect(hiddenSlugs).toEqual([
        'american-cheese', 'au-jus', 'banana', 'basil', 'bechamel', 'bologna', 'breaded-pork-tenderloin', 'butter',
        'cayenne-paste', 'celery', 'cheese-sauce', 'chicken-salad', 'comte', 'cuban-bread', 'emmental',
        'french-bread', 'french-fries', 'french-roll', 'fresh-mozzarella', 'fried-chicken', 'fried-shrimp',
        'giardiniera', 'green-pepper', 'ground-beef', 'ground-beef-patty', 'hamburger-bun', 'hoagie-roll',
        'hot-dog-bun', 'hot-peppers', 'jam', 'jelly', 'kaiser-roll', 'ketchup', 'kummelweck-roll', 'lobster',
        'maple-syrup', 'marinara-sauce', 'marshmallow-creme', 'meatballs', 'mornay-sauce', 'muffuletta-bread',
        'olive-oil', 'olive-salad', 'onion', 'pain-de-mie', 'parmesan', 'peanut-butter', 'pimentos', 'poached-egg',
        'powdered-sugar', 'roast-pork', 'sauteed-onions', 'smoked-brisket', 'spicy-brown-mustard', 'steak',
        'thousand-island',
      ])
    })

    it('all have complete nutrition and cost, so loading one never breaks the nutrition or cost panels', () => {
      const incomplete = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']
        .flatMap((slug) => getIngredientsByCategory(slug as CategorySlug))
        .filter((i) => !i.enabled)
        .filter((i) => {
          const nutrition = i.nutrition as Record<string, number> | null
          const cost = i.estimated_cost as Record<string, number> | null
          const complete = (record: Record<string, number> | null, keys: string[]) =>
            record !== null && keys.every((key) => typeof record[key] === 'number' && record[key] >= 0)
          return !complete(nutrition, NUTRITION_FIELDS.map((f) => f.key)) || !complete(cost, COST_FIELDS.map((f) => f.key))
        })
        .map((i) => i.slug)

      expect(incomplete).toEqual([])
    })

    it('keep every low price at or below its high price', () => {
      const inverted = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']
        .flatMap((slug) => getIngredientsByCategory(slug as CategorySlug))
        .filter((i) => !i.enabled)
        .filter((i) => {
          const cost = i.estimated_cost as Record<string, number> | null
          return cost === null || cost.retail_low > cost.retail_high || cost.restaurant_low > cost.restaurant_high
        })
        .map((i) => i.slug)

      expect(inverted).toEqual([])
    })
  })
})
