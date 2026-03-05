import { describe, it, expect } from 'vitest'
import { generateSandwichName } from '@/engine/naming'
import { makeComposition, makeIngredient } from '@/test/factories'

describe('generateSandwichName', () => {
  it('produces the format "Protein & Cheese on Bread"', () => {
    const composition = makeComposition()
    expect(generateSandwichName(composition)).toBe('Turkey & Swiss on Sourdough')
  })

  it('omits cheese when the cheese selection is no-cheese', () => {
    const composition = makeComposition({
      cheese: [makeIngredient({ name: 'No Cheese', slug: 'no-cheese' })],
    })
    expect(generateSandwichName(composition)).toBe('Turkey on Sourdough')
  })

  it('uses the actual ingredient names from the composition', () => {
    const composition = makeComposition({
      bread: [makeIngredient({ name: 'Rye', slug: 'rye' })],
      protein: [makeIngredient({ name: 'Pastrami', slug: 'pastrami' })],
      cheese: [makeIngredient({ name: 'Swiss', slug: 'swiss' })],
    })
    expect(generateSandwichName(composition)).toBe('Pastrami & Swiss on Rye')
  })

  it('omits cheese when cheese selection is empty', () => {
    const composition = makeComposition({ cheese: [] })
    expect(generateSandwichName(composition)).toBe('Turkey on Sourdough')
  })

  it('omits "on Bread" when bread selection is empty', () => {
    const composition = makeComposition({ bread: [] })
    expect(generateSandwichName(composition)).toBe('Turkey & Swiss')
  })

  it('omits both cheese and bread portions when both are empty', () => {
    const composition = makeComposition({ bread: [], cheese: [] })
    expect(generateSandwichName(composition)).toBe('Turkey')
  })
})
