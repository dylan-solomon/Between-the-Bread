import { describe, it, expect, beforeEach } from 'vitest'
import { makeComposition } from '@/test/factories'
import type { DoubleCategory } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'
import {
  saveSandwichState,
  restoreSandwichState,
  clearSandwichState,
} from '@/utils/sandwichStatePreservation'

const STORAGE_KEY = 'btb_preserved_sandwich'

beforeEach(() => {
  sessionStorage.clear()
})

describe('saveSandwichState', () => {
  it('stores composition, name, locked categories, and double categories in sessionStorage', () => {
    const composition = makeComposition()
    saveSandwichState({
      composition,
      name: 'Turkey & Swiss on Sourdough',
      lockedCategories: ['bread', 'protein'] as BaseCategory[],
      doubleCategories: ['protein'] as DoubleCategory[],
    })

    const stored = sessionStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored ?? '') as unknown
    expect(parsed).toEqual({
      composition,
      name: 'Turkey & Swiss on Sourdough',
      lockedCategories: ['bread', 'protein'],
      doubleCategories: ['protein'],
    })
  })

  it('stores empty arrays when no locks or doubles', () => {
    const composition = makeComposition()
    saveSandwichState({
      composition,
      name: 'Basic Sandwich',
      lockedCategories: [] as BaseCategory[],
      doubleCategories: [] as DoubleCategory[],
    })

    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '') as { lockedCategories: string[]; doubleCategories: string[] }
    expect(parsed.lockedCategories).toEqual([])
    expect(parsed.doubleCategories).toEqual([])
  })
})

describe('restoreSandwichState', () => {
  it('returns null when no state is stored', () => {
    expect(restoreSandwichState()).toBeNull()
  })

  it('returns the stored state when present', () => {
    const composition = makeComposition()
    const state = {
      composition,
      name: 'Turkey & Swiss on Sourdough',
      lockedCategories: ['bread'] as BaseCategory[],
      doubleCategories: ['cheese'] as DoubleCategory[],
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))

    const restored = restoreSandwichState()
    expect(restored).toEqual(state)
  })

  it('returns null when sessionStorage contains invalid JSON', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-json')
    expect(restoreSandwichState()).toBeNull()
  })

  it('returns null when stored data is missing composition', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Incomplete' }))
    expect(restoreSandwichState()).toBeNull()
  })
})

describe('clearSandwichState', () => {
  it('removes the stored state from sessionStorage', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ composition: makeComposition() }))
    clearSandwichState()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('does not throw when no state is stored', () => {
    expect(() => { clearSandwichState() }).not.toThrow()
  })
})
