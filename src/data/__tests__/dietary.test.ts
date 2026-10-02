import { describe, it, expect } from 'vitest'
import { filterByDiet } from '@/utils/dietary'
import { getEnabledIngredients } from '@/data/ingredients'
import { makeIngredient } from '@/test/factories'

describe('filterByDiet', () => {
  it('returns all ingredients when no tags are active', () => {
    const bread = getEnabledIngredients('bread')
    expect(filterByDiet(bread, [])).toHaveLength(17)
  })

  it('filters to ingredients matching a single tag', () => {
    const bread = getEnabledIngredients('bread')
    // 13 of 17 bread ingredients are vegan (brioche, croissant, texas-toast, naan are not)
    expect(filterByDiet(bread, ['vegan'])).toHaveLength(13)
  })

  it('filters to ingredients matching ALL active tags (intersection, not union)', () => {
    const toppings = getEnabledIngredients('toppings')
    // All 20 vegan toppings are also gluten_free — intersection is 20 (kimchi is made with fish sauce, so not vegan)
    expect(filterByDiet(toppings, ['vegan', 'gluten_free'])).toHaveLength(20)
  })

  it('returns empty array when no ingredients match all active tags', () => {
    const bread = getEnabledIngredients('bread')
    // No bread is gluten_free
    expect(filterByDiet(bread, ['gluten_free'])).toHaveLength(0)
  })

  it('returns empty array when passed an empty ingredient list', () => {
    expect(filterByDiet([], ['vegan'])).toHaveLength(0)
  })

  it('returned ingredients all carry every active tag', () => {
    const bread = getEnabledIngredients('bread')
    const filtered = filterByDiet(bread, ['vegan'])
    expect(filtered.every((i) => i.dietary_tags.includes('vegan'))).toBe(true)
  })

  describe('avoid tags', () => {
    const ham = makeIngredient({ name: 'Ham', slug: 'ham', dietary_tags: ['contains_pork', 'dairy_free'] })
    const turkey = makeIngredient({ name: 'Turkey', slug: 'turkey', dietary_tags: ['dairy_free'] })
    const salmon = makeIngredient({ name: 'Salmon', slug: 'salmon', dietary_tags: ['pescatarian', 'dairy_free'] })

    it('removes ingredients that carry an avoided tag', () => {
      expect(filterByDiet([ham, turkey, salmon], ['contains_pork']).map((i) => i.slug)).toEqual(['turkey', 'salmon'])
    })

    it('keeps ingredients that never mention the avoided tag', () => {
      expect(filterByDiet([turkey], ['contains_shellfish'])).toEqual([turkey])
    })

    it('combines must-have and avoid tags', () => {
      expect(filterByDiet([ham, turkey, salmon], ['dairy_free', 'contains_pork']).map((i) => i.slug)).toEqual([
        'turkey',
        'salmon',
      ])
      expect(filterByDiet([ham, turkey, salmon], ['pescatarian', 'contains_pork']).map((i) => i.slug)).toEqual(['salmon'])
    })

    it('applies several avoid tags together', () => {
      const shrimp = makeIngredient({ name: 'Shrimp', slug: 'shrimp', dietary_tags: ['pescatarian', 'contains_shellfish'] })

      expect(
        filterByDiet([ham, turkey, shrimp], ['contains_pork', 'contains_shellfish']).map((i) => i.slug),
      ).toEqual(['turkey'])
    })
  })
})
