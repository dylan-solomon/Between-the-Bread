import { describe, it, expect } from 'vitest'
import { getCategories, getIngredientById, getIngredientsByCategory } from '@/data/ingredients'
import { isDietaryTag } from '@/data/dietaryTags'
import type { DietaryTag } from '@/data/dietaryTags'
import type { Ingredient } from '@/types'

const allIngredients = (): Ingredient[] => getCategories().flatMap((category) => getIngredientsByCategory(category.slug))

const withTag = (tag: DietaryTag): string[] =>
  allIngredients().filter((i) => i.dietary_tags.includes(tag)).map((i) => i.slug)

const tagsOf = (slug: string): DietaryTag[] => getIngredientById(slug)?.dietary_tags ?? []

describe('ingredient dietary tags', () => {
  it('only use supported tags', () => {
    const unknown = allIngredients().flatMap((i) => i.dietary_tags.filter((tag) => !isDietaryTag(tag)))

    expect(unknown).toEqual([])
  })

  it('never list a tag twice for the same ingredient', () => {
    const duplicated = allIngredients().filter((i) => new Set(i.dietary_tags).size !== i.dietary_tags.length)

    expect(duplicated.map((i) => i.slug)).toEqual([])
  })

  describe('implied tags are stored explicitly', () => {
    it('every vegan ingredient is also vegetarian', () => {
      expect(withTag('vegan').filter((slug) => !tagsOf(slug).includes('vegetarian'))).toEqual([])
    })

    it('every vegetarian ingredient is also pescatarian', () => {
      expect(withTag('vegetarian').filter((slug) => !tagsOf(slug).includes('pescatarian'))).toEqual([])
    })

    it('every vegan ingredient is also dairy-free', () => {
      expect(withTag('vegan').filter((slug) => !tagsOf(slug).includes('dairy_free'))).toEqual([])
    })
  })

  describe('contradictions', () => {
    it('no pescatarian or vegetarian ingredient contains pork', () => {
      const conflicts = withTag('contains_pork').filter((slug) => {
        const tags = tagsOf(slug)
        return tags.includes('pescatarian') || tags.includes('vegetarian')
      })

      expect(conflicts).toEqual([])
    })

    it('no vegetarian or vegan ingredient contains shellfish', () => {
      const conflicts = withTag('contains_shellfish').filter((slug) => {
        const tags = tagsOf(slug)
        return tags.includes('vegetarian') || tags.includes('vegan')
      })

      expect(conflicts).toEqual([])
    })
  })

  describe('reviewed ingredients', () => {
    it('tags the pork products as containing pork', () => {
      expect(withTag('contains_pork').sort()).toEqual(
        ['bacon', 'bacon-jam', 'capicola', 'cuban-bread', 'ham', 'mortadella', 'pepperoni', 'prosciutto', 'pulled-pork', 'roast-pork', 'salami'].sort(),
      )
    })

    it('does not tag beef and poultry as containing pork', () => {
      const beefAndPoultry = ['turkey', 'roast-beef', 'pastrami', 'corned-beef', 'grilled-chicken']

      expect(beefAndPoultry.filter((slug) => tagsOf(slug).includes('contains_pork'))).toEqual([])
    })

    it('treats fish as pescatarian but not vegetarian', () => {
      expect(tagsOf('smoked-salmon')).toContain('pescatarian')
      expect(tagsOf('tuna-salad')).toContain('pescatarian')
      expect(tagsOf('smoked-salmon')).not.toContain('vegetarian')
    })

    it('does not treat meat as pescatarian', () => {
      const meats = ['turkey', 'roast-beef', 'ham', 'bacon', 'pepperoni', 'grilled-chicken', 'pulled-pork']

      expect(meats.filter((slug) => tagsOf(slug).includes('pescatarian'))).toEqual([])
    })

    it('treats kimchi as traditionally made with fish sauce and shrimp paste', () => {
      expect(tagsOf('kimchi')).toEqual(expect.arrayContaining(['pescatarian', 'contains_shellfish']))
      expect(tagsOf('kimchi')).not.toContain('vegetarian')
      expect(tagsOf('kimchi')).not.toContain('vegan')
    })

    it('treats green goddess as made with anchovy', () => {
      expect(tagsOf('green-goddess')).toContain('pescatarian')
      expect(tagsOf('green-goddess')).not.toContain('vegetarian')
    })

    it('keeps plant-based staples fully tagged', () => {
      expect(tagsOf('tofu')).toEqual(
        expect.arrayContaining(['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']),
      )
    })
  })
})
