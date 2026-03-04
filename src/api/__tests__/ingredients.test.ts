import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchIngredients } from '@/api/ingredients'
import type { Ingredient, CategorySlug } from '@/types'

const makeApiIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: 'test-uuid',
  name: 'Sourdough',
  slug: 'sourdough',
  dietary_tags: ['vegetarian', 'vegan'],
  compat_group: 'neutral',
  nutrition: { calories: 120, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 },
  image_asset: '/assets/ingredients/bread/sourdough.png',
  is_trigger: false,
  enabled: true,
  estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 },
  ...overrides,
})

const makeApiResponse = (overrides: Partial<Record<CategorySlug, Ingredient[]>> = {}) => ({
  data: {
    categories: [
      {
        id: 'cat-1',
        name: 'Bread',
        slug: 'bread',
        display_order: 1,
        selection_type: 'single',
        min_picks: 1,
        max_picks: 1,
        emoji: '🍞',
        color: '#D4A056',
        has_double_toggle: false,
        is_bonus: false,
        ingredients: overrides.bread ?? [makeApiIngredient()],
      },
    ],
  },
  meta: {
    timestamp: '2026-03-04T12:00:00Z',
    ingredient_count: 1,
    cost_data_last_updated: '2026-03-01',
    filters_applied: [],
  },
})

beforeEach(() => { vi.restoreAllMocks() })

describe('fetchIngredients', () => {
  it('returns pools keyed by category slug', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    }))

    const { pools } = await fetchIngredients()
    expect(pools).toHaveProperty('bread')
    expect(Array.isArray(pools.bread)).toBe(true)
  })

  it('returns categories array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    }))

    const { categories } = await fetchIngredients()
    expect(Array.isArray(categories)).toBe(true)
    expect(categories).toHaveLength(1)
    expect(categories[0]?.slug).toBe('bread')
    expect(categories[0]?.emoji).toBe('🍞')
  })

  it('includes ingredient data in the pool', async () => {
    const ingredient = makeApiIngredient({ name: 'Rye', slug: 'rye' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse({ bread: [ingredient] })),
    }))

    const { pools } = await fetchIngredients()
    expect(pools.bread).toHaveLength(1)
    expect(pools.bread[0]?.name).toBe('Rye')
    expect(pools.bread[0]?.id).toBe('test-uuid')
  })

  it('passes diet filter as query param', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchIngredients(['vegan', 'gluten_free'])

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('diet=vegan%2Cgluten_free')
  })

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }))

    await expect(fetchIngredients()).rejects.toThrow('503')
  })

  it('returns empty arrays for categories not in the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    }))

    const { pools } = await fetchIngredients()
    expect(pools.protein).toEqual([])
    expect(pools.cheese).toEqual([])
  })
})
