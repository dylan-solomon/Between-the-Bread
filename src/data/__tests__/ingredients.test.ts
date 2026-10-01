import { describe, it, expect } from 'vitest'
import {
  getCategories,
  getIngredientsByCategory,
  getEnabledIngredients,
  getIngredientById,
  getTriggerIngredients,
} from '@/data/ingredients'
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
  it('returns 19 bread ingredients', () => {
    expect(getIngredientsByCategory('bread')).toHaveLength(19)
  })

  it('returns 23 protein ingredients', () => {
    expect(getIngredientsByCategory('protein')).toHaveLength(23)
  })

  it('returns 20 cheese ingredients', () => {
    expect(getIngredientsByCategory('cheese')).toHaveLength(20)
  })

  it('returns 22 toppings ingredients', () => {
    expect(getIngredientsByCategory('toppings')).toHaveLength(22)
  })

  it('returns 26 condiments ingredients', () => {
    expect(getIngredientsByCategory('condiments')).toHaveLength(26)
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

      expect(hidden).toEqual(['pain-de-mie', 'cuban-bread'])
    })

    it('are left out of the enabled ingredients', () => {
      const enabled = getEnabledIngredients('bread').map((i) => i.slug)

      expect(enabled).toHaveLength(17)
      expect(enabled).not.toContain('pain-de-mie')
      expect(enabled).not.toContain('cuban-bread')
    })

    it('are exactly the ingredients used by encyclopedia sandwiches that the randomizer lacks', () => {
      const hiddenSlugs = ['bread', 'protein', 'cheese', 'toppings', 'condiments', 'chefs-special']
        .flatMap((slug) => getIngredientsByCategory(slug as CategorySlug))
        .filter((i) => !i.enabled)
        .map((i) => i.slug)
        .sort()

      expect(hiddenSlugs).toEqual([
        'american-cheese', 'bechamel', 'butter', 'comte', 'cuban-bread', 'emmental', 'ground-beef-patty',
        'jam', 'maple-syrup', 'pain-de-mie', 'poached-egg', 'powdered-sugar', 'roast-pork', 'thousand-island',
      ])
    })
  })
})
