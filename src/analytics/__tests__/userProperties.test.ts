import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  setTotalSaved,
  setTotalFavorites,
  setAvgRatingGiven,
  setDietaryFilters,
  setUsesSmartMode,
  setUsesDoubleProtein,
  setUsesDoubleCheese,
  setCostContext,
  setLastActiveAt,
} from '@/analytics/userProperties'
import type { DietaryTag } from '@/types'

const { mockSetPersonProperties } = vi.hoisted(() => ({
  mockSetPersonProperties: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: { setPersonProperties: mockSetPersonProperties },
}))

beforeEach(() => {
  mockSetPersonProperties.mockClear()
})

describe('setTotalSaved', () => {
  it('sets total_saved property', () => {
    setTotalSaved(5)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ total_saved: 5 })
  })
})

describe('setTotalFavorites', () => {
  it('sets total_favorites property', () => {
    setTotalFavorites(3)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ total_favorites: 3 })
  })
})

describe('setAvgRatingGiven', () => {
  it('sets avg_rating_given property', () => {
    setAvgRatingGiven(4.2)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ avg_rating_given: 4.2 })
  })
})

describe('setDietaryFilters', () => {
  it('sets dietary_filters property', () => {
    const filters: DietaryTag[] = ['vegan', 'gluten_free']
    setDietaryFilters(filters)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ dietary_filters: ['vegan', 'gluten_free'] })
  })
})

describe('setUsesSmartMode', () => {
  it('sets uses_smart_mode property', () => {
    setUsesSmartMode(true)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ uses_smart_mode: true })
  })
})

describe('setUsesDoubleProtein', () => {
  it('sets uses_double_protein property', () => {
    setUsesDoubleProtein(true)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ uses_double_protein: true })
  })
})

describe('setUsesDoubleCheese', () => {
  it('sets uses_double_cheese property', () => {
    setUsesDoubleCheese(false)
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ uses_double_cheese: false })
  })
})

describe('setCostContext', () => {
  it('sets cost_context property', () => {
    setCostContext('restaurant')
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ cost_context: 'restaurant' })
  })
})

describe('setLastActiveAt', () => {
  it('sets last_active_at to current ISO timestamp', () => {
    const before = new Date().toISOString()
    setLastActiveAt()
    const call = mockSetPersonProperties.mock.calls[0][0] as { last_active_at: string }
    expect(call.last_active_at).toBeDefined()
    expect(call.last_active_at >= before).toBe(true)
  })
})
