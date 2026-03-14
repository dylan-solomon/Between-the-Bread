import { describe, it, expect } from 'vitest'
import { rollCategory, rollAll } from '@/engine/randomizer'
import { makeCategories, makeIngredient, makePool } from '@/test/factories'
import type { CompatMatrixRow } from '@/types'

const categories = makeCategories()

// ─── rollCategory ─────────────────────────────────────────────────────────────

describe('rollCategory — single pick categories', () => {
  it('returns exactly 1 ingredient for bread', () => {
    const pool = makePool(10)
    expect(rollCategory('bread', pool, { categories })).toHaveLength(1)
  })

  it('returns exactly 1 ingredient for protein', () => {
    const pool = makePool(10)
    expect(rollCategory('protein', pool, { categories })).toHaveLength(1)
  })

  it('returns exactly 1 ingredient for cheese', () => {
    const pool = makePool(10)
    expect(rollCategory('cheese', pool, { categories })).toHaveLength(1)
  })

  it('returned ingredient comes from the provided pool', () => {
    const pool = makePool(10)
    const [result] = rollCategory('bread', pool, { categories })
    expect(pool).toContainEqual(result)
  })
})

describe('rollCategory — multi pick categories', () => {
  it('returns between 1 and 4 ingredients for toppings', () => {
    const pool = makePool(10)
    // Run many times to exercise the full range
    const counts = Array.from({ length: 100 }, () => rollCategory('toppings', pool, { categories }).length)
    expect(counts.every((n) => n >= 1 && n <= 4)).toBe(true)
  })

  it('returns between 1 and 2 ingredients for condiments', () => {
    const pool = makePool(10)
    const counts = Array.from({ length: 100 }, () => rollCategory('condiments', pool, { categories }).length)
    expect(counts.every((n) => n >= 1 && n <= 2)).toBe(true)
  })

  it('never returns duplicate ingredients within a single roll', () => {
    const pool = makePool(10)
    const results = Array.from({ length: 100 }, () => rollCategory('toppings', pool, { categories }))
    const hasDuplicates = results.some((roll) => {
      const slugs = roll.map((i) => i.slug)
      return new Set(slugs).size !== slugs.length
    })
    expect(hasDuplicates).toBe(false)
  })

  it('all returned ingredients come from the provided pool', () => {
    const pool = makePool(10)
    const results = Array.from({ length: 50 }, () => rollCategory('toppings', pool, { categories }))
    const allFromPool = results.every((roll) => roll.every((i) => pool.includes(i)))
    expect(allFromPool).toBe(true)
  })
})

describe('rollCategory — edge cases', () => {
  it('returns empty array when pool is empty', () => {
    expect(rollCategory('bread', [], { categories })).toHaveLength(0)
    expect(rollCategory('toppings', [], { categories })).toHaveLength(0)
  })

  it('returns at most pool.length items when pool is smaller than max_picks', () => {
    const smallPool = makePool(2)
    const counts = Array.from({ length: 50 }, () => rollCategory('toppings', smallPool, { categories }).length)
    expect(counts.every((n) => n <= 2)).toBe(true)
  })
})

describe('rollCategory — explicit count override (double mode)', () => {
  it('returns exactly count items when count is specified', () => {
    const pool = makePool(10)
    expect(rollCategory('protein', pool, { categories, count: 2 })).toHaveLength(2)
  })

  it('returns no duplicates when count is specified', () => {
    const pool = makePool(10)
    const results = Array.from({ length: 50 }, () => rollCategory('protein', pool, { categories, count: 2 }))
    const hasDuplicates = results.some((roll) => {
      const slugs = roll.map((i) => i.slug)
      return new Set(slugs).size !== slugs.length
    })
    expect(hasDuplicates).toBe(false)
  })

  it('returns at most pool.length when count exceeds pool size', () => {
    const pool = makePool(1)
    expect(rollCategory('protein', pool, { categories, count: 2 })).toHaveLength(1)
  })

  it('excludes no-X ingredients (e.g. no-cheese) when count > 1', () => {
    const noCheese = makeIngredient({ slug: 'no-cheese' })
    const pool = [noCheese, ...makePool(5)]
    const results = Array.from({ length: 200 }, () => rollCategory('cheese', pool, { categories, count: 2 }))
    const containsNoCheese = results.some((roll) => roll.some((i) => i.slug === 'no-cheese'))
    expect(containsNoCheese).toBe(false)
  })

  it('still allows no-X ingredients in single (count=1) mode', () => {
    const noCheese = makeIngredient({ slug: 'no-cheese' })
    const results = rollCategory('cheese', [noCheese], { categories })
    expect(results[0]?.slug).toBe('no-cheese')
  })
})

// ─── rollCategory — smartOptions ─────────────────────────────────────────────

describe('rollCategory — smartOptions', () => {
  const matrix: CompatMatrixRow[] = [
    { group_a: 'italian', group_b: 'mediterranean', affinity: 0.99 },
    { group_a: 'american', group_b: 'italian', affinity: 0.01 },
  ]

  it('without smartOptions, behavior is unchanged (pure random)', () => {
    const pool = makePool(10)
    const result = rollCategory('bread', pool, { categories })
    expect(result).toHaveLength(1)
    expect(pool).toContainEqual(result[0])
  })

  it('with smartOptions and priorGroups, high-affinity ingredient is picked more often over 200 trials', () => {
    const highAffinity = makeIngredient({ slug: 'high', compat_group: 'mediterranean' })
    const lowAffinity = makeIngredient({ slug: 'low', compat_group: 'american' })
    // italian prior → mediterranean affinity 0.99, american affinity 0.01
    const smartOptions = { priorGroups: ['italian'] as const, matrix }
    const counts = { high: 0, low: 0 }
    for (let i = 0; i < 200; i++) {
      const result = rollCategory('bread', [highAffinity, lowAffinity], { categories, smartOptions })
      if (result[0]?.slug === 'high') counts.high++
      else counts.low++
    }
    expect(counts.high).toBeGreaterThan(counts.low)
  })

  it('with smartOptions and count=2 (double mode), both picks are weighted', () => {
    const italian1 = makeIngredient({ slug: 'i1', compat_group: 'italian' })
    const italian2 = makeIngredient({ slug: 'i2', compat_group: 'italian' })
    const american = makeIngredient({ slug: 'a1', compat_group: 'american' })
    // italian prior → italian affinity 1.0 (self), american 0.01
    const smartOptions = { priorGroups: ['italian'] as const, matrix }
    const americanPickCount = Array.from({ length: 100 }, () =>
      rollCategory('protein', [italian1, italian2, american], { categories, count: 2, smartOptions }),
    ).filter((roll) => roll.some((i) => i.slug === 'a1')).length
    // american should rarely be picked vs two high-affinity italians
    expect(americanPickCount).toBeLessThan(40)
  })

  it('with smartOptions but empty priorGroups, returns uniform (same as no smartOptions)', () => {
    const pool = makePool(5)
    const result = rollCategory('bread', pool, {
      categories,
      smartOptions: { priorGroups: [], matrix },
    })
    expect(result).toHaveLength(1)
    expect(pool).toContainEqual(result[0])
  })
})

// ─── rollAll ─────────────────────────────────────────────────────────────────

describe('rollAll', () => {
  const pools = {
    bread: makePool(17),
    protein: makePool(10),
    cheese: makePool(10),
    toppings: makePool(20),
    condiments: makePool(10),
  }

  const noDoubles = new Set<'protein' | 'cheese'>()

  it('returns selections for all 5 base categories', () => {
    const result = rollAll({ categories, pools, lockedSlugs: new Set(), currentSelections: {}, doubleCategories: noDoubles })
    expect(result).toHaveProperty('bread')
    expect(result).toHaveProperty('protein')
    expect(result).toHaveProperty('cheese')
    expect(result).toHaveProperty('toppings')
    expect(result).toHaveProperty('condiments')
  })

  it('preserves current selection for a locked category', () => {
    const lockedBread = [makeIngredient({ slug: 'sourdough', name: 'Sourdough' })]
    const result = rollAll({
      categories,
      pools,
      lockedSlugs: new Set(['bread'] as const),
      currentSelections: { bread: lockedBread },
      doubleCategories: noDoubles,
    })
    expect(result.bread).toBe(lockedBread)
  })

  it('re-rolls unlocked categories on each call', () => {
    const results = Array.from({ length: 20 }, () =>
      rollAll({ categories, pools, lockedSlugs: new Set(), currentSelections: {}, doubleCategories: noDoubles }),
    )
    const breadSlugs = results.map((r) => r.bread[0]?.slug)
    // With 17 bread options, 20 rolls should produce more than 1 unique result
    expect(new Set(breadSlugs).size).toBeGreaterThan(1)
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
      categories,
      pools,
      lockedSlugs: new Set(['bread', 'protein', 'cheese', 'toppings', 'condiments'] as const),
      currentSelections: current,
      doubleCategories: noDoubles,
    })
    expect(result.bread).toBe(current.bread)
    expect(result.protein).toBe(current.protein)
    expect(result.cheese).toBe(current.cheese)
    expect(result.toppings).toBe(current.toppings)
    expect(result.condiments).toBe(current.condiments)
  })

  it('selects 2 protein when protein is doubled', () => {
    const result = rollAll({
      categories,
      pools,
      lockedSlugs: new Set(),
      currentSelections: {},
      doubleCategories: new Set(['protein'] as const),
    })
    expect(result.protein).toHaveLength(2)
  })

  it('selects 2 cheese when cheese is doubled', () => {
    const result = rollAll({
      categories,
      pools,
      lockedSlugs: new Set(),
      currentSelections: {},
      doubleCategories: new Set(['cheese'] as const),
    })
    expect(result.cheese).toHaveLength(2)
  })

  it('selects 1 protein when not doubled', () => {
    const results = Array.from({ length: 20 }, () =>
      rollAll({ categories, pools, lockedSlugs: new Set(), currentSelections: {}, doubleCategories: noDoubles }),
    )
    expect(results.every((r) => r.protein.length === 1)).toBe(true)
  })
})
