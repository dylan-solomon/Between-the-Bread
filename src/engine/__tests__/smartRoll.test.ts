import { describe, it, expect } from 'vitest'
import { buildCompatWeights, weightedSample } from '@/engine/smartRoll'
import { makeIngredient } from '@/test/factories'
import type { CompatMatrixRow } from '@/types'

const matrix: CompatMatrixRow[] = [
  { group_a: 'italian', group_b: 'mediterranean', affinity: 0.85 },
  { group_a: 'american', group_b: 'italian', affinity: 0.50 },
  { group_a: 'american', group_b: 'mediterranean', affinity: 0.30 },
]

describe('buildCompatWeights', () => {
  it('returns all 1.0 when priorGroups is empty', () => {
    const pool = [
      makeIngredient({ compat_group: 'italian' }),
      makeIngredient({ compat_group: 'american' }),
    ]
    const weights = buildCompatWeights(pool, [], matrix)
    expect(weights).toEqual([1.0, 1.0])
  })

  it('gives higher weight to ingredient matching the prior group', () => {
    const italian = makeIngredient({ compat_group: 'italian' })
    const american = makeIngredient({ compat_group: 'american' })
    const weights = buildCompatWeights([italian, american], ['mediterranean'], matrix)
    // italian ↔ mediterranean = 0.85, american ↔ mediterranean = 0.30
    expect(weights[0]).toBeGreaterThan(weights[1] ?? 0)
  })

  it('uses self-affinity of 1.0 when ingredient group matches prior group', () => {
    const pool = [makeIngredient({ compat_group: 'italian' })]
    const weights = buildCompatWeights(pool, ['italian'], matrix)
    expect(weights[0]).toBe(1.0)
  })

  it('averages affinity across multiple prior groups', () => {
    const pool = [makeIngredient({ compat_group: 'italian' })]
    // italian ↔ italian = 1.0, italian ↔ mediterranean = 0.85 → avg = 0.925
    const weights = buildCompatWeights(pool, ['italian', 'mediterranean'], matrix)
    expect(weights[0]).toBeCloseTo(0.925)
  })

  it('applies 10% floor — no weight falls below 0.1 / pool.length', () => {
    // american with affinity 0.0 against italian → floor kicks in
    const tinyMatrix: CompatMatrixRow[] = [
      { group_a: 'american', group_b: 'italian', affinity: 0.0 },
    ]
    const americanPool = [makeIngredient({ compat_group: 'american' })]
    const weights = buildCompatWeights(americanPool, ['italian'], tinyMatrix)
    const floor = 0.1 / americanPool.length
    expect(weights[0]).toBeGreaterThanOrEqual(floor)
  })

  it('does not require a matrix row for self-affinity', () => {
    const pool = [makeIngredient({ compat_group: 'tex_mex' })]
    const emptyMatrix: CompatMatrixRow[] = []
    const weights = buildCompatWeights(pool, ['tex_mex'], emptyMatrix)
    expect(weights[0]).toBe(1.0)
  })

  it('returns the correct number of weights for the pool size', () => {
    const pool = [
      makeIngredient({ compat_group: 'italian' }),
      makeIngredient({ compat_group: 'american' }),
      makeIngredient({ compat_group: 'southern' }),
    ]
    const weights = buildCompatWeights(pool, ['italian'], matrix)
    expect(weights).toHaveLength(3)
  })
})

describe('weightedSample', () => {
  it('always returns an item from the list', () => {
    const items = ['a', 'b', 'c']
    const weights = [1, 1, 1]
    const result = weightedSample(items, weights)
    expect(items).toContain(result)
  })

  it('returns the only item when list has one element', () => {
    expect(weightedSample(['only'], [1.0])).toBe('only')
  })

  it('picks high-weight items more often over many trials', () => {
    const items = ['low', 'high']
    const weights = [0.1, 0.9]
    const counts = { low: 0, high: 0 }
    for (let i = 0; i < 1000; i++) {
      const result = weightedSample(items, weights)
      counts[result as 'low' | 'high']++
    }
    expect(counts.high).toBeGreaterThan(counts.low)
  })

  it('always returns the item with weight > 0 when others are 0', () => {
    const items = ['never', 'always']
    const weights = [0, 1]
    for (let i = 0; i < 20; i++) {
      expect(weightedSample(items, weights)).toBe('always')
    }
  })
})
