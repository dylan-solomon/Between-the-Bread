import { describe, it, expect } from 'vitest'
import { makeIngredientLookup, parseIngredientCell } from '../ingredientCell'
import type { IngredientCategory } from '../types'

const lookup = makeIngredientLookup({
  bread: ['White Bread', 'Rye', 'Marble Rye', 'Pain de mie'],
  protein: ['Ham', 'Fried Egg', 'Poached Egg', 'Roast pork', 'Salami', 'Turkey'],
  cheese: ['American', 'Cheddar', 'Swiss', 'Gruyere', 'Emmental', 'Comté'],
  toppings: ['Tomato', 'Pickles'],
  condiments: ['Butter', 'Mayo', 'Powdered sugar', 'Maple syrup', 'Jam', 'Mustard', 'Béchamel'],
})

const parse = (category: IngredientCategory, text: string | null) => parseIngredientCell({ text, category, lookup })

describe('parseIngredientCell', () => {
  it.each([null, '', '   ', 'None', 'none'])('returns nothing for %j', (text) => {
    expect(parse('bread', text)).toEqual({ names: [], skipped: [] })
  })

  it('returns a single ingredient using the site spelling', () => {
    expect(parse('bread', 'white bread').names).toEqual(['White Bread'])
  })

  it('matches without regard to accents', () => {
    expect(parse('cheese', 'Comte').names).toEqual(['Comté'])
    expect(parse('condiments', 'Bechamel').names).toEqual(['Béchamel'])
  })

  it('only matches ingredients in the same category', () => {
    expect(parse('bread', 'Ham')).toEqual({ names: [], skipped: [{ text: 'Ham', reason: 'not on the site' }] })
  })

  it('keeps ingredients used together', () => {
    expect(parse('protein', 'Roast pork, Ham').names).toEqual(['Roast pork', 'Ham'])
  })

  describe('alternatives', () => {
    it('uses the first alternative when the choice is written with or', () => {
      expect(parse('cheese', 'American or Cheddar').names).toEqual(['American'])
    })

    it('treats a list ending in ", or" as alternatives and uses the first', () => {
      expect(parse('cheese', 'Gruyere, Emmental, or Comté').names).toEqual(['Gruyere'])
    })

    it('keeps the ingredients that come before an or', () => {
      expect(parse('protein', 'Ham, Fried Egg or Poached Egg').names).toEqual(['Ham', 'Fried Egg'])
    })

    it('uses the first alternative that is on the site', () => {
      expect(parse('cheese', 'Colby or Cheddar').names).toEqual(['Cheddar'])
    })

    it('does not use an alternative that is not on the site as a replacement for a matched one', () => {
      expect(parse('condiments', 'Powdered sugar, Maple syrup or Jam').names).toEqual(['Powdered sugar', 'Maple syrup'])
    })

    it('reports a choice with no alternative on the site', () => {
      expect(parse('cheese', 'Colby or Longhorn')).toEqual({ names: [], skipped: [{ text: 'Colby', reason: 'not on the site' }] })
    })
  })

  describe('notes in brackets', () => {
    it('ignores a toasted note', () => {
      expect(parse('bread', 'White Bread (toasted)').names).toEqual(['White Bread'])
    })

    it('leaves out optional ingredients and says so', () => {
      expect(parse('toppings', 'Tomato (optional)')).toEqual({ names: [], skipped: [{ text: 'Tomato', reason: 'optional' }] })
    })

    it('leaves out ingredients that only apply in one place', () => {
      expect(parse('protein', 'Roast pork, Ham, Salami (Tampa)')).toEqual({
        names: ['Roast pork', 'Ham'],
        skipped: [{ text: 'Salami', reason: 'optional' }],
      })
    })

    it('leaves out an optional ingredient even when it follows an or', () => {
      expect(parse('protein', 'Ham, Turkey (optional)')).toEqual({ names: ['Ham'], skipped: [{ text: 'Turkey', reason: 'optional' }] })
    })
  })

  it('reports ingredients the site does not have', () => {
    expect(parse('toppings', 'Egg dip')).toEqual({ names: [], skipped: [{ text: 'Egg dip', reason: 'not on the site' }] })
  })

  it('does not list the same ingredient twice', () => {
    expect(parse('protein', 'Ham, ham').names).toEqual(['Ham'])
  })
})
