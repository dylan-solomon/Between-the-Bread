import { describe, it, expect } from 'vitest'
import {
  getCategories,
  getIngredientsByCategory,
  getEnabledIngredients,
  getIngredientById,
  getTriggerIngredients,
} from '@/data/ingredients'

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
  it('returns 17 bread ingredients', () => {
    expect(getIngredientsByCategory('bread')).toHaveLength(17)
  })

  it('returns 20 protein ingredients', () => {
    expect(getIngredientsByCategory('protein')).toHaveLength(20)
  })

  it('returns 17 cheese ingredients', () => {
    expect(getIngredientsByCategory('cheese')).toHaveLength(17)
  })

  it('returns 22 toppings ingredients', () => {
    expect(getIngredientsByCategory('toppings')).toHaveLength(22)
  })

  it('returns 20 condiments ingredients', () => {
    expect(getIngredientsByCategory('condiments')).toHaveLength(20)
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
})
