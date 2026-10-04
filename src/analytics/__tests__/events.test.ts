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
  captureEncyclopediaViewed,
  captureEncyclopediaEntryViewed,
  captureEncyclopediaSearched,
  captureEncyclopediaFiltered,
  captureEncyclopediaTryThisClicked,
  captureCommunityViewed,
  captureCommunityEntryViewed,
  captureCommunitySorted,
  captureCommunityFiltered,
  captureCommunityTryThisClicked,
  captureSearchPerformed,
  captureSandwichRated,
  captureCommentPosted,
  capturePhotoUploaded,
  captureSearchResultClicked,
  captureSearchHeaderOpened,
  captureSearchHeaderClosed,
  captureBlogViewed,
  captureBlogCategorySelected,
  captureBlogPostViewed,
  captureBlogPostShared,
  captureBlogRelatedSandwichClicked,
  identifyUser,
  resetIdentity,
} from '@/analytics/events'

const { mockCapture, mockIdentify, mockReset } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockIdentify: vi.fn(),
  mockReset: vi.fn(),
}))

vi.mock('@/analytics/client', () => ({
  withPostHog: (call: (posthog: unknown) => void) => {
    call({ capture: mockCapture, identify: mockIdentify, reset: mockReset })
  },
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

describe('blog events', () => {
  it('captureBlogViewed fires blog_viewed', () => {
    captureBlogViewed()
    expect(mockCapture).toHaveBeenCalledWith('blog_viewed')
  })

  it('captureBlogCategorySelected fires blog_category_selected with the category slug', () => {
    captureBlogCategorySelected({ category: 'dietary' })
    expect(mockCapture).toHaveBeenCalledWith('blog_category_selected', { category: 'dietary' })
  })

  it('captureBlogPostViewed fires blog_post_viewed with the slug and category slugs', () => {
    captureBlogPostViewed({ slug: 'vegan-builds', categories: ['dietary', 'sandwich-ideas'] })
    expect(mockCapture).toHaveBeenCalledWith('blog_post_viewed', {
      slug: 'vegan-builds',
      categories: ['dietary', 'sandwich-ideas'],
    })
  })

  it('captureBlogPostShared fires blog_post_shared with the slug', () => {
    captureBlogPostShared({ slug: 'vegan-builds' })
    expect(mockCapture).toHaveBeenCalledWith('blog_post_shared', { slug: 'vegan-builds' })
  })

  it('captureBlogRelatedSandwichClicked fires blog_related_sandwich_clicked with both slugs', () => {
    captureBlogRelatedSandwichClicked({ postSlug: 'vegan-builds', sandwichSlug: 'reuben' })
    expect(mockCapture).toHaveBeenCalledWith('blog_related_sandwich_clicked', {
      post_slug: 'vegan-builds',
      sandwich_slug: 'reuben',
    })
  })
})

describe('sandwich page contribution events', () => {
  it('captureSandwichRated fires sandwich_rated with the page type, slug and score', () => {
    captureSandwichRated({ targetType: 'community', slug: 'ham-abc12345', score: 4 })
    expect(mockCapture).toHaveBeenCalledWith('sandwich_rated', { target_type: 'community', slug: 'ham-abc12345', score: 4 })
  })

  it('captureCommentPosted fires comment_posted saying whether it was a reply', () => {
    captureCommentPosted({ targetType: 'blog', slug: 'vegan-builds', isReply: true })
    expect(mockCapture).toHaveBeenCalledWith('comment_posted', { target_type: 'blog', slug: 'vegan-builds', is_reply: true })
  })

  it('capturePhotoUploaded fires photo_uploaded with the page type and slug', () => {
    capturePhotoUploaded({ targetType: 'database', slug: 'reuben' })
    expect(mockCapture).toHaveBeenCalledWith('photo_uploaded', { target_type: 'database', slug: 'reuben' })
  })
})

describe('search events', () => {
  it('captureSearchPerformed fires search_performed with the query, tab, result count and where it was searched', () => {
    captureSearchPerformed({ query: 'reuben', source: 'all', resultsCount: 7, surface: 'page' })
    expect(mockCapture).toHaveBeenCalledWith('search_performed', { query: 'reuben', source: 'all', results_count: 7, surface: 'page' })
  })

  it('captureSearchResultClicked fires search_result_clicked with the result and its position', () => {
    captureSearchResultClicked({ query: 'reuben', resultSource: 'database', slug: 'reuben', position: 1, surface: 'header' })
    expect(mockCapture).toHaveBeenCalledWith('search_result_clicked', {
      query: 'reuben',
      result_source: 'database',
      slug: 'reuben',
      position: 1,
      surface: 'header',
    })
  })

  it('captureSearchHeaderOpened fires search_header_opened', () => {
    captureSearchHeaderOpened()
    expect(mockCapture).toHaveBeenCalledWith('search_header_opened')
  })

  it('captureSearchHeaderClosed fires search_header_closed', () => {
    captureSearchHeaderClosed()
    expect(mockCapture).toHaveBeenCalledWith('search_header_closed')
  })
})

describe('community events', () => {
  it('captureCommunityViewed fires community_viewed', () => {
    captureCommunityViewed()
    expect(mockCapture).toHaveBeenCalledWith('community_viewed')
  })

  it('captureCommunityEntryViewed fires community_entry_viewed with the slug', () => {
    captureCommunityEntryViewed({ slug: 'ham-abc12345' })
    expect(mockCapture).toHaveBeenCalledWith('community_entry_viewed', { slug: 'ham-abc12345' })
  })

  it('captureCommunitySorted fires community_sorted with the sort mode', () => {
    captureCommunitySorted({ sort: 'trending' })
    expect(mockCapture).toHaveBeenCalledWith('community_sorted', { sort: 'trending' })
  })

  it('captureCommunityFiltered fires community_filtered with the filter values', () => {
    captureCommunityFiltered({ diet: ['vegan'], ingredient: 'ham', sort: 'top_rated' })
    expect(mockCapture).toHaveBeenCalledWith('community_filtered', { diet: ['vegan'], ingredient: 'ham', sort: 'top_rated' })
  })

  it('captureCommunityTryThisClicked fires community_try_this_clicked with the slug', () => {
    captureCommunityTryThisClicked({ slug: 'ham-abc12345' })
    expect(mockCapture).toHaveBeenCalledWith('community_try_this_clicked', { slug: 'ham-abc12345' })
  })
})

describe('encyclopedia events', () => {
  it('captureEncyclopediaViewed fires encyclopedia_viewed', () => {
    captureEncyclopediaViewed()
    expect(mockCapture).toHaveBeenCalledWith('encyclopedia_viewed')
  })

  it('captureEncyclopediaEntryViewed fires encyclopedia_entry_viewed with the slug', () => {
    captureEncyclopediaEntryViewed({ slug: 'reuben' })
    expect(mockCapture).toHaveBeenCalledWith('encyclopedia_entry_viewed', { slug: 'reuben' })
  })

  it('captureEncyclopediaSearched fires encyclopedia_searched with the query and result count', () => {
    captureEncyclopediaSearched({ query: 'ham', resultsCount: 4 })
    expect(mockCapture).toHaveBeenCalledWith('encyclopedia_searched', { query: 'ham', results_count: 4 })
  })

  it('captureEncyclopediaFiltered fires encyclopedia_filtered with the filter values', () => {
    captureEncyclopediaFiltered({ region: 'Asia', diet: ['vegan'], sort: 'rating' })
    expect(mockCapture).toHaveBeenCalledWith('encyclopedia_filtered', { region: 'Asia', diet: ['vegan'], sort: 'rating' })
  })

  it('captureEncyclopediaTryThisClicked fires encyclopedia_try_this_clicked with the slug', () => {
    captureEncyclopediaTryThisClicked({ slug: 'reuben' })
    expect(mockCapture).toHaveBeenCalledWith('encyclopedia_try_this_clicked', { slug: 'reuben' })
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
