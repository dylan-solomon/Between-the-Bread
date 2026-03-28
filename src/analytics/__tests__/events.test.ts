import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DietaryTag } from '@/types'
import {
  captureRolledAll,
  captureRolledCategory,
  captureLockedCategory,
  captureUnlockedCategory,
  captureSandwichCompleted,
  captureChefSpecialTriggered,
  capturePageView,
  capturePerformance,
  captureDietaryFilterToggled,
  captureDietaryFilterWarning,
  captureSmartModeToggled,
  captureShareLinkCreated,
  captureShareLinkCopied,
  captureShareLinkVisited,
  captureShareMakeYourOwnClicked,
  captureNutritionPanelExpanded,
  captureNutritionPanelCollapsed,
  captureDoubleToggled,
  captureAccountSignedUp,
  captureAccountLoggedIn,
  captureAccountLoggedOut,
  captureAccountDeleted,
  captureAuthPrompted,
  captureAuthPromptDismissed,
  captureHistorySandwichSaved,
  captureHistorySandwichRated,
  captureHistorySandwichFavorited,
  captureHistorySandwichUnfavorited,
  captureHistorySandwichDeleted,
  captureHistoryCleared,
  captureHistoryViewed,
  captureHistorySearched,
  identifyUser,
  resetIdentity,
} from '@/analytics/events'

const { mockCapture, mockIdentify, mockReset } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockIdentify: vi.fn(),
  mockReset: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  default: { capture: mockCapture, identify: mockIdentify, reset: mockReset },
}))

beforeEach(() => {
  mockCapture.mockClear()
  mockIdentify.mockClear()
  mockReset.mockClear()
})

describe('captureRolledAll', () => {
  it('calls posthog.capture with generator_rolled_all', () => {
    captureRolledAll({ rollNumber: 1, lockedCategories: [], activeDietaryFilters: [], smartMode: false })
    expect(mockCapture).toHaveBeenCalledWith('generator_rolled_all', expect.anything())
  })

  it('includes roll_number in properties', () => {
    captureRolledAll({ rollNumber: 3, lockedCategories: [], activeDietaryFilters: [], smartMode: false })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ roll_number: 3 }))
  })

  it('includes locked_categories as array', () => {
    captureRolledAll({ rollNumber: 1, lockedCategories: ['bread', 'protein'], activeDietaryFilters: [], smartMode: false })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locked_categories: ['bread', 'protein'] }))
  })

  it('includes active_dietary_filters', () => {
    captureRolledAll({ rollNumber: 1, lockedCategories: [], activeDietaryFilters: ['vegan', 'gluten_free'], smartMode: false })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ active_dietary_filters: ['vegan', 'gluten_free'] }))
  })

  it('includes smart_mode: true when smartMode is true', () => {
    captureRolledAll({ rollNumber: 1, lockedCategories: [], activeDietaryFilters: [], smartMode: true })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ smart_mode: true }))
  })
})

describe('captureRolledCategory', () => {
  it('calls posthog.capture with generator_rolled_category', () => {
    captureRolledCategory({ category: 'cheese', rollNumber: 1, previousIngredient: null, newIngredient: 'swiss' })
    expect(mockCapture).toHaveBeenCalledWith('generator_rolled_category', expect.anything())
  })

  it('includes category, roll_number, previous_ingredient, new_ingredient', () => {
    captureRolledCategory({ category: 'cheese', rollNumber: 2, previousIngredient: 'cheddar', newIngredient: 'swiss' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      category: 'cheese',
      roll_number: 2,
      previous_ingredient: 'cheddar',
      new_ingredient: 'swiss',
    }))
  })

  it('sends null for previous_ingredient when there was none', () => {
    captureRolledCategory({ category: 'bread', rollNumber: 1, previousIngredient: null, newIngredient: 'sourdough' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ previous_ingredient: null }))
  })
})

describe('captureLockedCategory', () => {
  it('calls posthog.capture with generator_locked_category', () => {
    captureLockedCategory({ category: 'protein', lockedIngredient: 'turkey' })
    expect(mockCapture).toHaveBeenCalledWith('generator_locked_category', expect.anything())
  })

  it('includes category and locked_ingredient', () => {
    captureLockedCategory({ category: 'protein', lockedIngredient: 'turkey' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      category: 'protein',
      locked_ingredient: 'turkey',
    }))
  })
})

describe('captureUnlockedCategory', () => {
  it('calls posthog.capture with generator_unlocked_category', () => {
    captureUnlockedCategory({ category: 'protein' })
    expect(mockCapture).toHaveBeenCalledWith('generator_unlocked_category', expect.anything())
  })

  it('includes category', () => {
    captureUnlockedCategory({ category: 'protein' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ category: 'protein' }))
  })
})

describe('captureSandwichCompleted', () => {
  const baseProps = {
    sandwichName: 'The Smoky Italian',
    bread: ['sourdough'],
    protein: ['turkey'],
    cheese: ['swiss'],
    toppings: ['lettuce', 'tomato'],
    condiments: ['mustard'],
    chefsSpecial: null,
    totalRolls: 1,
    activeDietaryFilters: [] as DietaryTag[],
    smartMode: false,
  }

  it('calls posthog.capture with generator_sandwich_completed', () => {
    captureSandwichCompleted(baseProps)
    expect(mockCapture).toHaveBeenCalledWith('generator_sandwich_completed', expect.anything())
  })

  it('maps sandwichName to sandwich_name', () => {
    captureSandwichCompleted(baseProps)
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sandwich_name: 'The Smoky Italian' }))
  })

  it('maps chefsSpecial to chefs_special', () => {
    captureSandwichCompleted({ ...baseProps, chefsSpecial: 'secret-sauce' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ chefs_special: 'secret-sauce' }))
  })

  it('includes total_rolls', () => {
    captureSandwichCompleted({ ...baseProps, totalRolls: 5 })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ total_rolls: 5 }))
  })

  it('includes all ingredient arrays', () => {
    captureSandwichCompleted(baseProps)
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      bread: ['sourdough'],
      protein: ['turkey'],
      cheese: ['swiss'],
      toppings: ['lettuce', 'tomato'],
      condiments: ['mustard'],
    }))
  })

  it('includes active_dietary_filters', () => {
    captureSandwichCompleted({ ...baseProps, activeDietaryFilters: ['vegetarian'] })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ active_dietary_filters: ['vegetarian'] }))
  })

  it('includes smart_mode: true when smartMode is true', () => {
    captureSandwichCompleted({ ...baseProps, smartMode: true })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ smart_mode: true }))
  })
})

describe('captureChefSpecialTriggered', () => {
  it('calls posthog.capture with generator_chefs_special_triggered', () => {
    captureChefSpecialTriggered({ chefsSpecialIngredient: 'secret-sauce', triggerTopping: 'trigger-a', toppingCount: 3 })
    expect(mockCapture).toHaveBeenCalledWith('generator_chefs_special_triggered', expect.anything())
  })

  it('includes chefs_special_ingredient, trigger_topping, topping_count', () => {
    captureChefSpecialTriggered({ chefsSpecialIngredient: 'secret-sauce', triggerTopping: 'trigger-a', toppingCount: 3 })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      chefs_special_ingredient: 'secret-sauce',
      trigger_topping: 'trigger-a',
      topping_count: 3,
    }))
  })
})

describe('capturePageView', () => {
  it('calls posthog.capture with $pageview', () => {
    capturePageView('/')
    expect(mockCapture).toHaveBeenCalledWith('$pageview', expect.anything())
  })

  it('includes current_url with the provided path', () => {
    capturePageView('/about')
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ current_url: '/about' }))
  })
})

describe('capturePerformance', () => {
  it('calls posthog.capture with performance_page_load', () => {
    capturePerformance({ lcpMs: 1200, fidMs: null, cls: 0.05, ttfbMs: 300, page: '/', connectionType: '4g' })
    expect(mockCapture).toHaveBeenCalledWith('performance_page_load', expect.anything())
  })

  it('maps lcpMs to lcp_ms and cls to cls', () => {
    capturePerformance({ lcpMs: 1200, fidMs: 50, cls: 0.05, ttfbMs: 300, page: '/about', connectionType: null })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      lcp_ms: 1200,
      fid_ms: 50,
      cls: 0.05,
      ttfb_ms: 300,
      page: '/about',
      connection_type: null,
    }))
  })
})

describe('captureDietaryFilterToggled', () => {
  it('calls posthog.capture with filter_dietary_toggled', () => {
    captureDietaryFilterToggled({ tag: 'vegan', isActive: true, activeFilters: ['vegan'] })
    expect(mockCapture).toHaveBeenCalledWith('filter_dietary_toggled', expect.anything())
  })

  it('includes tag, is_active, and active_filters', () => {
    captureDietaryFilterToggled({ tag: 'gluten_free', isActive: true, activeFilters: ['vegan', 'gluten_free'] })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      tag: 'gluten_free',
      is_active: true,
      active_filters: ['vegan', 'gluten_free'],
    }))
  })

  it('reflects is_active false when deactivating a filter', () => {
    captureDietaryFilterToggled({ tag: 'vegan', isActive: false, activeFilters: [] })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ is_active: false }))
  })
})

describe('captureDietaryFilterWarning', () => {
  it('calls posthog.capture with filter_dietary_warning', () => {
    captureDietaryFilterWarning({ tag: 'vegan', affectedCategories: ['protein'] })
    expect(mockCapture).toHaveBeenCalledWith('filter_dietary_warning', expect.anything())
  })

  it('includes tag and affected_categories', () => {
    captureDietaryFilterWarning({ tag: 'gluten_free', affectedCategories: ['bread', 'protein'] })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      tag: 'gluten_free',
      affected_categories: ['bread', 'protein'],
    }))
  })
})

describe('captureSmartModeToggled', () => {
  it('calls posthog.capture with generator_smart_mode_toggled', () => {
    captureSmartModeToggled({ isActive: true })
    expect(mockCapture).toHaveBeenCalledWith('generator_smart_mode_toggled', expect.anything())
  })

  it('includes is_active: true when activating', () => {
    captureSmartModeToggled({ isActive: true })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ is_active: true }))
  })

  it('includes is_active: false when deactivating', () => {
    captureSmartModeToggled({ isActive: false })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ is_active: false }))
  })
})

describe('captureShareLinkCreated', () => {
  it('calls posthog.capture with share_link_created', () => {
    captureShareLinkCreated({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
    expect(mockCapture).toHaveBeenCalledWith('share_link_created', expect.anything())
  })

  it('includes hash and url', () => {
    captureShareLinkCreated({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      hash: 'abc12345',
      url: 'https://betweenbread.co/s/abc12345',
    }))
  })
})

describe('captureShareLinkCopied', () => {
  it('calls posthog.capture with share_link_copied', () => {
    captureShareLinkCopied({ hash: 'abc12345' })
    expect(mockCapture).toHaveBeenCalledWith('share_link_copied', expect.anything())
  })

  it('includes hash', () => {
    captureShareLinkCopied({ hash: 'abc12345' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ hash: 'abc12345' }))
  })
})

describe('captureShareLinkVisited', () => {
  it('calls posthog.capture with share_link_visited', () => {
    captureShareLinkVisited({ hash: 'abc12345', sandwichName: 'The Club' })
    expect(mockCapture).toHaveBeenCalledWith('share_link_visited', expect.anything())
  })

  it('includes hash and sandwich_name', () => {
    captureShareLinkVisited({ hash: 'abc12345', sandwichName: 'The Club' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      hash: 'abc12345',
      sandwich_name: 'The Club',
    }))
  })
})

describe('captureShareMakeYourOwnClicked', () => {
  it('calls posthog.capture with share_make_your_own_clicked', () => {
    captureShareMakeYourOwnClicked({ sourceHash: 'abc12345' })
    expect(mockCapture).toHaveBeenCalledWith('share_make_your_own_clicked', expect.anything())
  })

  it('includes source_hash', () => {
    captureShareMakeYourOwnClicked({ sourceHash: 'abc12345' })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source_hash: 'abc12345' }))
  })
})

describe('captureNutritionPanelExpanded', () => {
  it('calls posthog.capture with nutrition_panel_expanded', () => {
    captureNutritionPanelExpanded()
    expect(mockCapture).toHaveBeenCalledWith('nutrition_panel_expanded')
  })
})

describe('captureNutritionPanelCollapsed', () => {
  it('calls posthog.capture with nutrition_panel_collapsed', () => {
    captureNutritionPanelCollapsed()
    expect(mockCapture).toHaveBeenCalledWith('nutrition_panel_collapsed')
  })
})

describe('captureDoubleToggled', () => {
  it('calls posthog.capture with generator_double_toggled', () => {
    captureDoubleToggled({ category: 'protein', enabled: true })
    expect(mockCapture).toHaveBeenCalledWith('generator_double_toggled', expect.anything())
  })

  it('includes category and enabled properties', () => {
    captureDoubleToggled({ category: 'cheese', enabled: false })
    expect(mockCapture).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      category: 'cheese',
      enabled: false,
    }))
  })
})

describe('captureAccountSignedUp', () => {
  it('calls posthog.capture with account_signed_up', () => {
    captureAccountSignedUp({ method: 'email' })
    expect(mockCapture).toHaveBeenCalledWith('account_signed_up', { method: 'email' })
  })
})

describe('captureAccountLoggedIn', () => {
  it('calls posthog.capture with account_logged_in', () => {
    captureAccountLoggedIn({ method: 'email' })
    expect(mockCapture).toHaveBeenCalledWith('account_logged_in', { method: 'email' })
  })
})

describe('captureAccountLoggedOut', () => {
  it('calls posthog.capture with account_logged_out', () => {
    captureAccountLoggedOut()
    expect(mockCapture).toHaveBeenCalledWith('account_logged_out')
  })
})

describe('captureAuthPrompted', () => {
  it('calls posthog.capture with account_auth_prompted', () => {
    captureAuthPrompted({ actionAttempted: 'save your sandwich' })
    expect(mockCapture).toHaveBeenCalledWith('account_auth_prompted', { action_attempted: 'save your sandwich' })
  })
})

describe('captureAuthPromptDismissed', () => {
  it('calls posthog.capture with account_auth_prompt_dismissed', () => {
    captureAuthPromptDismissed({ actionAttempted: 'rate this sandwich' })
    expect(mockCapture).toHaveBeenCalledWith('account_auth_prompt_dismissed', { action_attempted: 'rate this sandwich' })
  })
})

describe('captureHistorySandwichSaved', () => {
  it('calls posthog.capture with history_sandwich_saved', () => {
    captureHistorySandwichSaved({ sandwichName: 'The Club', savedCount: 5 })
    expect(mockCapture).toHaveBeenCalledWith('history_sandwich_saved', { sandwich_name: 'The Club', saved_count: 5 })
  })
})

describe('captureHistorySandwichRated', () => {
  it('calls posthog.capture with history_sandwich_rated', () => {
    captureHistorySandwichRated({ rating: 4, previousRating: null, sandwichName: 'The Club' })
    expect(mockCapture).toHaveBeenCalledWith('history_sandwich_rated', { rating: 4, previous_rating: null, sandwich_name: 'The Club' })
  })
})

describe('captureHistorySandwichFavorited', () => {
  it('calls posthog.capture with history_sandwich_favorited', () => {
    captureHistorySandwichFavorited({ sandwichName: 'The Club', totalFavorites: 3 })
    expect(mockCapture).toHaveBeenCalledWith('history_sandwich_favorited', { sandwich_name: 'The Club', total_favorites: 3 })
  })
})

describe('captureHistorySandwichUnfavorited', () => {
  it('calls posthog.capture with history_sandwich_unfavorited', () => {
    captureHistorySandwichUnfavorited({ sandwichName: 'The Club' })
    expect(mockCapture).toHaveBeenCalledWith('history_sandwich_unfavorited', { sandwich_name: 'The Club' })
  })
})

describe('captureHistorySandwichDeleted', () => {
  it('calls posthog.capture with history_sandwich_deleted', () => {
    captureHistorySandwichDeleted()
    expect(mockCapture).toHaveBeenCalledWith('history_sandwich_deleted')
  })
})

describe('captureHistoryCleared', () => {
  it('calls posthog.capture with history_cleared', () => {
    captureHistoryCleared({ deletedCount: 10, includedFavorites: false })
    expect(mockCapture).toHaveBeenCalledWith('history_cleared', { deleted_count: 10, included_favorites: false })
  })
})

describe('captureHistoryViewed', () => {
  it('calls posthog.capture with history_viewed', () => {
    captureHistoryViewed()
    expect(mockCapture).toHaveBeenCalledWith('history_viewed')
  })
})

describe('captureHistorySearched', () => {
  it('calls posthog.capture with history_searched', () => {
    captureHistorySearched({ query: 'turkey', resultsCount: 3, filtersApplied: ['favorites_only'] })
    expect(mockCapture).toHaveBeenCalledWith('history_searched', { query: 'turkey', results_count: 3, filters_applied: ['favorites_only'] })
  })
})

describe('identifyUser', () => {
  it('calls posthog.identify with userId and user properties', () => {
    identifyUser({ userId: 'user-123', email: 'test@example.com', signupMethod: 'email', signupDate: '2026-01-01' })
    expect(mockIdentify).toHaveBeenCalledWith('user-123', {
      email: 'test@example.com',
      signup_method: 'email',
      signup_date: '2026-01-01',
    })
  })

  it('includes signup_trigger when provided', () => {
    identifyUser({ userId: 'user-123', email: 'test@example.com', signupMethod: 'email', signupDate: '2026-01-01', signupTrigger: 'save_prompt' })
    expect(mockIdentify).toHaveBeenCalledWith('user-123', {
      email: 'test@example.com',
      signup_method: 'email',
      signup_date: '2026-01-01',
      signup_trigger: 'save_prompt',
    })
  })

  it('omits signup_trigger when not provided', () => {
    identifyUser({ userId: 'user-123', email: 'test@example.com', signupMethod: 'email', signupDate: '2026-01-01' })
    const properties = mockIdentify.mock.calls[0][1] as Record<string, unknown>
    expect(properties).not.toHaveProperty('signup_trigger')
  })
})

describe('captureAccountDeleted', () => {
  it('fires account_deleted event', () => {
    captureAccountDeleted()
    expect(mockCapture).toHaveBeenCalledWith('account_deleted')
  })
})

describe('resetIdentity', () => {
  it('calls posthog.reset', () => {
    resetIdentity()
    expect(mockReset).toHaveBeenCalled()
  })
})
