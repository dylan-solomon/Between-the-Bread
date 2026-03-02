import { describe, it, expect } from 'vitest'
import { buildComposition } from '@/engine/composition'
import { makeIngredient } from '@/test/factories'

const baseSelections = {
  bread: [makeIngredient({ slug: 'sourdough' })],
  protein: [makeIngredient({ slug: 'turkey' })],
  cheese: [makeIngredient({ slug: 'swiss' })],
  toppings: [makeIngredient({ slug: 'lettuce' }), makeIngredient({ slug: 'tomato' })],
  condiments: [makeIngredient({ slug: 'mayo' })],
}

describe('buildComposition', () => {
  it('assembles all 5 base categories', () => {
    const composition = buildComposition(baseSelections)
    expect(composition.bread).toEqual(baseSelections.bread)
    expect(composition.protein).toEqual(baseSelections.protein)
    expect(composition.cheese).toEqual(baseSelections.cheese)
    expect(composition.toppings).toEqual(baseSelections.toppings)
    expect(composition.condiments).toEqual(baseSelections.condiments)
  })

  it("includes chef's special when provided", () => {
    const chefsSpecial = [makeIngredient({ slug: 'truffle-oil' })]
    const composition = buildComposition(baseSelections, chefsSpecial)
    expect(composition['chefs-special']).toEqual(chefsSpecial)
  })

  it("omits chef's special when not provided", () => {
    const composition = buildComposition(baseSelections)
    expect(composition['chefs-special']).toBeUndefined()
  })
})
