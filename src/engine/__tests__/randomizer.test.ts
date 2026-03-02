import { describe, it, expect } from 'vitest'
import { rollCategory, rollAll } from '@/engine/randomizer'
import { getEnabledIngredients } from '@/data/ingredients'
import { makeIngredient, makePool } from '@/test/factories'

// ─── rollCategory ─────────────────────────────────────────────────────────────

describe('rollCategory — single pick categories', () => {
  it('returns exactly 1 ingredient for bread', () => {
    const pool = makePool(10)
    expect(rollCategory('bread', pool)).toHaveLength(1)
  })

  it('returns exactly 1 ingredient for protein', () => {
    const pool = makePool(10)
    expect(rollCategory('protein', pool)).toHaveLength(1)
  })

  it('returns exactly 1 ingredient for cheese', () => {
    const pool = makePool(10)
    expect(rollCategory('cheese', pool)).toHaveLength(1)
  })

  it('returned ingredient comes from the provided pool', () => {
    const pool = makePool(10)
    const [result] = rollCategory('bread', pool)
    expect(pool).toContainEqual(result)
  })
})

describe('rollCategory — multi pick categories', () => {
  it('returns between 1 and 4 ingredients for toppings', () => {
    const pool = makePool(10)
    // Run many times to exercise the full range
    const counts = Array.from({ length: 100 }, () => rollCategory('toppings', pool).length)
    expect(counts.every((n) => n >= 1 && n <= 4)).toBe(true)
  })

  it('returns between 1 and 2 ingredients for condiments', () => {
    const pool = makePool(10)
    const counts = Array.from({ length: 100 }, () => rollCategory('condiments', pool).length)
    expect(counts.every((n) => n >= 1 && n <= 2)).toBe(true)
  })

  it('never returns duplicate ingredients within a single roll', () => {
    const pool = makePool(10)
    const results = Array.from({ length: 100 }, () => rollCategory('toppings', pool))
    const hasDuplicates = results.some((roll) => {
      const slugs = roll.map((i) => i.slug)
      return new Set(slugs).size !== slugs.length
    })
    expect(hasDuplicates).toBe(false)
  })

  it('all returned ingredients come from the provided pool', () => {
    const pool = makePool(10)
    const results = Array.from({ length: 50 }, () => rollCategory('toppings', pool))
    const allFromPool = results.every((roll) => roll.every((i) => pool.includes(i)))
    expect(allFromPool).toBe(true)
  })
})

describe('rollCategory — edge cases', () => {
  it('returns empty array when pool is empty', () => {
    expect(rollCategory('bread', [])).toHaveLength(0)
    expect(rollCategory('toppings', [])).toHaveLength(0)
  })

  it('returns at most pool.length items when pool is smaller than max_picks', () => {
    const smallPool = makePool(2)
    const counts = Array.from({ length: 50 }, () => rollCategory('toppings', smallPool).length)
    expect(counts.every((n) => n <= 2)).toBe(true)
  })
})

// ─── rollAll ─────────────────────────────────────────────────────────────────

describe('rollAll', () => {
  const pools = {
    bread: getEnabledIngredients('bread'),
    protein: getEnabledIngredients('protein'),
    cheese: getEnabledIngredients('cheese'),
    toppings: getEnabledIngredients('toppings'),
    condiments: getEnabledIngredients('condiments'),
  }

  it('returns selections for all 5 base categories', () => {
    const result = rollAll({ pools, lockedSlugs: new Set(), currentSelections: {} })
    expect(result).toHaveProperty('bread')
    expect(result).toHaveProperty('protein')
    expect(result).toHaveProperty('cheese')
    expect(result).toHaveProperty('toppings')
    expect(result).toHaveProperty('condiments')
  })

  it('preserves current selection for a locked category', () => {
    const lockedBread = [makeIngredient({ slug: 'sourdough', name: 'Sourdough' })]
    const result = rollAll({
      pools,
      lockedSlugs: new Set(['bread'] as const),
      currentSelections: { bread: lockedBread },
    })
    expect(result.bread).toBe(lockedBread)
  })

  it('re-rolls unlocked categories on each call', () => {
    // Run rollAll 20 times with no locks — results should not all be identical
    const results = Array.from({ length: 20 }, () =>
      rollAll({ pools, lockedSlugs: new Set(), currentSelections: {} }),
    )
    const breadSlugs = results.map((r) => r.bread[0]?.slug)
    const uniqueSlugs = new Set(breadSlugs)
    // With 17 bread options, 20 rolls should produce more than 1 unique result
    expect(uniqueSlugs.size).toBeGreaterThan(1)
  })

  it('when all 5 categories are locked, returns all current selections unchanged', () => {
    const current = {
      bread: [makeIngredient({ slug: 'rye' })],
      protein: [makeIngredient({ slug: 'turkey' })],
      cheese: [makeIngredient({ slug: 'swiss' })],
      toppings: [makeIngredient({ slug: 'lettuce' })],
      condiments: [makeIngredient({ slug: 'mayo' })],
    }
    const result = rollAll({
      pools,
      lockedSlugs: new Set(['bread', 'protein', 'cheese', 'toppings', 'condiments'] as const),
      currentSelections: current,
    })
    expect(result.bread).toBe(current.bread)
    expect(result.protein).toBe(current.protein)
    expect(result.cheese).toBe(current.cheese)
    expect(result.toppings).toBe(current.toppings)
    expect(result.condiments).toBe(current.condiments)
  })
})
