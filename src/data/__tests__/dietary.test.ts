import { describe, it, expect } from 'vitest'
import { filterByDiet } from '@/utils/dietary'
import { getIngredientsByCategory } from '@/data/ingredients'

describe('filterByDiet', () => {
  it('returns all ingredients when no tags are active', () => {
    const bread = getIngredientsByCategory('bread')
    expect(filterByDiet(bread, [])).toHaveLength(17)
  })

  it('filters to ingredients matching a single tag', () => {
    const bread = getIngredientsByCategory('bread')
    // 13 of 17 bread ingredients are vegan (brioche, croissant, texas-toast, naan are not)
    expect(filterByDiet(bread, ['vegan'])).toHaveLength(13)
  })

  it('filters to ingredients matching ALL active tags (intersection, not union)', () => {
    const toppings = getIngredientsByCategory('toppings')
    // All 21 vegan toppings are also gluten_free — intersection is 21
    expect(filterByDiet(toppings, ['vegan', 'gluten_free'])).toHaveLength(21)
  })

  it('returns empty array when no ingredients match all active tags', () => {
    const bread = getIngredientsByCategory('bread')
    // No bread is gluten_free
    expect(filterByDiet(bread, ['gluten_free'])).toHaveLength(0)
  })

  it('returns empty array when passed an empty ingredient list', () => {
    expect(filterByDiet([], ['vegan'])).toHaveLength(0)
  })

  it('returned ingredients all carry every active tag', () => {
    const bread = getIngredientsByCategory('bread')
    const filtered = filterByDiet(bread, ['vegan'])
    expect(filtered.every((i) => i.dietary_tags.includes('vegan'))).toBe(true)
  })
})
