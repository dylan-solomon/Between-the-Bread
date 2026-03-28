import posthog from 'posthog-js'
import type { DietaryTag } from '@/types'

export const setTotalSaved = (count: number): void => {
  posthog.setPersonProperties({ total_saved: count })
}

export const setTotalFavorites = (count: number): void => {
  posthog.setPersonProperties({ total_favorites: count })
}

export const setAvgRatingGiven = (avg: number): void => {
  posthog.setPersonProperties({ avg_rating_given: avg })
}

export const setDietaryFilters = (filters: DietaryTag[]): void => {
  posthog.setPersonProperties({ dietary_filters: filters })
}

export const setUsesSmartMode = (enabled: boolean): void => {
  posthog.setPersonProperties({ uses_smart_mode: enabled })
}

export const setUsesDoubleProtein = (enabled: boolean): void => {
  posthog.setPersonProperties({ uses_double_protein: enabled })
}

export const setUsesDoubleCheese = (enabled: boolean): void => {
  posthog.setPersonProperties({ uses_double_cheese: enabled })
}

export const setCostContext = (context: 'retail' | 'restaurant'): void => {
  posthog.setPersonProperties({ cost_context: context })
}

export const setLastActiveAt = (): void => {
  posthog.setPersonProperties({ last_active_at: new Date().toISOString() })
}
