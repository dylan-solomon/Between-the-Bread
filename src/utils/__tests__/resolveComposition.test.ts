import { describe, it, expect } from 'vitest'
import { resolveComposition } from '@/utils/resolveComposition'
import { makeIngredient } from '@/test/factories'
import type { CategorySlug, Ingredient } from '@/types'

const sourdough = makeIngredient({ name: 'Sourdough', slug: 'sourdough' })
const turkey = makeIngredient({ name: 'Turkey', slug: 'turkey' })
const swiss = makeIngredient({ name: 'Swiss', slug: 'swiss' })
const lettuce = makeIngredient({ name: 'Lettuce', slug: 'lettuce' })
const mayo = makeIngredient({ name: 'Mayo', slug: 'mayo' })
const hotHoney = makeIngredient({ name: 'Hot Honey', slug: 'hot-honey' })

const pools: Partial<Record<CategorySlug, Ingredient[]>> = {
  bread: [sourdough, makeIngredient({ name: 'Rye', slug: 'rye' })],
  protein: [turkey, makeIngredient({ name: 'Ham', slug: 'ham' })],
  cheese: [swiss],
  toppings: [lettuce, makeIngredient({ name: 'Tomato', slug: 'tomato' })],
  condiments: [mayo],
  'chefs-special': [hotHoney],
}

describe('resolveComposition', () => {
  it('resolves a stored composition with slug+name objects to full Ingredient objects', () => {
    const stored = {
      bread: [{ slug: 'sourdough', name: 'Sourdough' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
      condiments: [{ slug: 'mayo', name: 'Mayo' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result).not.toBeNull()
    expect(result?.bread[0]).toEqual(sourdough)
    expect(result?.protein[0]).toEqual(turkey)
    expect(result?.cheese[0]).toEqual(swiss)
    expect(result?.toppings[0]).toEqual(lettuce)
    expect(result?.condiments[0]).toEqual(mayo)
  })

  it('resolves a composition with plain string slugs', () => {
    const stored = {
      bread: ['sourdough'],
      protein: ['turkey'],
      cheese: ['swiss'],
      toppings: ['lettuce'],
      condiments: ['mayo'],
    }

    const result = resolveComposition(stored, pools)

    expect(result).not.toBeNull()
    expect(result?.bread[0]).toEqual(sourdough)
  })

  it('resolves chefs-special when present', () => {
    const stored = {
      bread: [{ slug: 'sourdough', name: 'Sourdough' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
      condiments: [{ slug: 'mayo', name: 'Mayo' }],
      'chefs-special': [{ slug: 'hot-honey', name: 'Hot Honey' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result?.['chefs-special']).toEqual([hotHoney])
  })

  it('returns null when a required category has an unresolvable slug', () => {
    const stored = {
      bread: [{ slug: 'nonexistent', name: 'Nonexistent' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
      condiments: [{ slug: 'mayo', name: 'Mayo' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result).toBeNull()
  })

  it('handles double picks (multiple ingredients per category)', () => {
    const ham = makeIngredient({ name: 'Ham', slug: 'ham' })
    const stored = {
      bread: [{ slug: 'sourdough', name: 'Sourdough' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }, { slug: 'ham', name: 'Ham' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
      condiments: [{ slug: 'mayo', name: 'Mayo' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result?.protein).toEqual([turkey, ham])
  })

  it('returns null when a required category is missing from stored composition', () => {
    const stored = {
      bread: [{ slug: 'sourdough', name: 'Sourdough' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result).toBeNull()
  })

  it('skips chefs-special gracefully when not in stored composition', () => {
    const stored = {
      bread: [{ slug: 'sourdough', name: 'Sourdough' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      toppings: [{ slug: 'lettuce', name: 'Lettuce' }],
      condiments: [{ slug: 'mayo', name: 'Mayo' }],
    }

    const result = resolveComposition(stored, pools)

    expect(result).not.toBeNull()
    expect(result?.['chefs-special']).toBeUndefined()
  })
})
