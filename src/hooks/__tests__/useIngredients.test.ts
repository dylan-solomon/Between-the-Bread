import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIngredients } from '@/hooks/useIngredients'
import { makeCategories } from '@/test/factories'
import type { CategorySlug, Ingredient } from '@/types'

const { mockFetchIngredients } = vi.hoisted(() => ({
  mockFetchIngredients: vi.fn(),
}))

vi.mock('@/api/ingredients', () => ({
  fetchIngredients: mockFetchIngredients,
}))

const makePools = (): Record<CategorySlug, Ingredient[]> => ({
  bread: [{ id: 'b1', name: 'Sourdough', slug: 'sourdough', dietary_tags: [], compat_group: 'neutral', nutrition: { calories: 120, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 }, image_asset: '', is_trigger: false, enabled: true, estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 } }],
  protein: [],
  cheese: [],
  toppings: [],
  condiments: [],
  'chefs-special': [],
})

const makeFetchResult = () => ({ pools: makePools(), categories: makeCategories() })

beforeEach(() => { mockFetchIngredients.mockReset() })

describe('useIngredients', () => {
  it('starts in loading state', () => {
    mockFetchIngredients.mockReturnValue(new Promise(() => undefined))
    const { result } = renderHook(() => useIngredients())
    expect(result.current.loading).toBe(true)
    expect(result.current.pools).toEqual({})
    expect(result.current.categories).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns pools after successful fetch', async () => {
    const { pools } = makeFetchResult()
    mockFetchIngredients.mockResolvedValue({ pools, categories: makeCategories() })

    const { result } = renderHook(() => useIngredients())
    await waitFor(() => { expect(result.current.loading).toBe(false) })

    expect(result.current.pools).toEqual(pools)
    expect(result.current.error).toBeNull()
  })

  it('returns categories after successful fetch', async () => {
    const categories = makeCategories()
    mockFetchIngredients.mockResolvedValue({ pools: makePools(), categories })

    const { result } = renderHook(() => useIngredients())
    await waitFor(() => { expect(result.current.loading).toBe(false) })

    expect(result.current.categories).toEqual(categories)
  })

  it('returns error message when fetch fails', async () => {
    mockFetchIngredients.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useIngredients())
    await waitFor(() => { expect(result.current.loading).toBe(false) })

    expect(result.current.error).toBe('Network error')
    expect(result.current.pools).toEqual({})
    expect(result.current.categories).toEqual([])
  })

  it('calls fetchIngredients once on mount', async () => {
    mockFetchIngredients.mockResolvedValue(makeFetchResult())
    renderHook(() => useIngredients())
    await waitFor(() => { expect(mockFetchIngredients).toHaveBeenCalledOnce() })
  })

  it('loading is false after fetch resolves', async () => {
    mockFetchIngredients.mockResolvedValue(makeFetchResult())
    const { result } = renderHook(() => useIngredients())
    await waitFor(() => { expect(result.current.loading).toBe(false) })
  })
})
