import posthog from 'posthog-js'
import type { DietaryTag } from '@/types'

export const captureRolledAll = (props: {
  rollNumber: number
  lockedCategories: string[]
  activeDietaryFilters: DietaryTag[]
  smartMode: boolean
}): void => {
  posthog.capture('generator_rolled_all', {
    roll_number: props.rollNumber,
    locked_categories: props.lockedCategories,
    smart_mode: props.smartMode,
    active_dietary_filters: props.activeDietaryFilters,
  })
}

export const captureRolledCategory = (props: {
  category: string
  rollNumber: number
  previousIngredient: string | null
  newIngredient: string
}): void => {
  posthog.capture('generator_rolled_category', {
    category: props.category,
    roll_number: props.rollNumber,
    previous_ingredient: props.previousIngredient,
    new_ingredient: props.newIngredient,
  })
}

export const captureLockedCategory = (props: {
  category: string
  lockedIngredient: string
}): void => {
  posthog.capture('generator_locked_category', {
    category: props.category,
    locked_ingredient: props.lockedIngredient,
  })
}

export const captureUnlockedCategory = (props: { category: string }): void => {
  posthog.capture('generator_unlocked_category', { category: props.category })
}

export const captureSandwichCompleted = (props: {
  sandwichName: string
  bread: string[]
  protein: string[]
  cheese: string[]
  toppings: string[]
  condiments: string[]
  chefsSpecial: string | null
  totalRolls: number
  activeDietaryFilters: DietaryTag[]
  smartMode: boolean
}): void => {
  posthog.capture('generator_sandwich_completed', {
    sandwich_name: props.sandwichName,
    bread: props.bread,
    protein: props.protein,
    cheese: props.cheese,
    toppings: props.toppings,
    condiments: props.condiments,
    chefs_special: props.chefsSpecial,
    total_rolls: props.totalRolls,
    smart_mode: props.smartMode,
    active_dietary_filters: props.activeDietaryFilters,
  })
}

export const captureChefSpecialTriggered = (props: {
  chefsSpecialIngredient: string
  triggerTopping: string
  toppingCount: number
}): void => {
  posthog.capture('generator_chefs_special_triggered', {
    chefs_special_ingredient: props.chefsSpecialIngredient,
    trigger_topping: props.triggerTopping,
    topping_count: props.toppingCount,
  })
}

export const capturePageView = (pagePath: string): void => {
  posthog.capture('$pageview', { current_url: pagePath })
}

export const captureSmartModeToggled = (props: { isActive: boolean }): void => {
  posthog.capture('generator_smart_mode_toggled', { is_active: props.isActive })
}

export const captureDietaryFilterToggled = (props: {
  tag: DietaryTag
  isActive: boolean
  activeFilters: DietaryTag[]
}): void => {
  posthog.capture('filter_dietary_toggled', {
    tag: props.tag,
    is_active: props.isActive,
    active_filters: props.activeFilters,
  })
}

export const captureDietaryFilterWarning = (props: {
  tag: DietaryTag
  affectedCategories: string[]
}): void => {
  posthog.capture('filter_dietary_warning', {
    tag: props.tag,
    affected_categories: props.affectedCategories,
  })
}

export const captureCostContextToggled = (props: { context: 'retail' | 'restaurant' }): void => {
  posthog.capture('generator_cost_context_toggled', { context: props.context })
}

export const captureShareLinkCreated = (props: { hash: string; url: string }): void => {
  posthog.capture('share_link_created', { hash: props.hash, url: props.url })
}

export const captureShareLinkCopied = (props: { hash: string }): void => {
  posthog.capture('share_link_copied', { hash: props.hash })
}

export const captureShareLinkVisited = (props: { hash: string; sandwichName: string }): void => {
  posthog.capture('share_link_visited', { hash: props.hash, sandwich_name: props.sandwichName })
}

export const captureShareMakeYourOwnClicked = (props: { sourceHash: string }): void => {
  posthog.capture('share_make_your_own_clicked', { source_hash: props.sourceHash })
}

export const captureDoubleToggled = (props: { category: string; enabled: boolean }): void => {
  posthog.capture('generator_double_toggled', { category: props.category, enabled: props.enabled })
}

export const captureNutritionPanelExpanded = (): void => {
  posthog.capture('nutrition_panel_expanded')
}

export const captureNutritionPanelCollapsed = (): void => {
  posthog.capture('nutrition_panel_collapsed')
}

export const capturePerformance = (props: {
  lcpMs: number | null
  fidMs: number | null
  cls: number | null
  ttfbMs: number | null
  page: string
  connectionType: string | null
}): void => {
  posthog.capture('performance_page_load', {
    lcp_ms: props.lcpMs,
    fid_ms: props.fidMs,
    cls: props.cls,
    ttfb_ms: props.ttfbMs,
    page: props.page,
    connection_type: props.connectionType,
  })
}

export const captureAuthPrompted = (props: { actionAttempted: string }): void => {
  posthog.capture('account_auth_prompted', { action_attempted: props.actionAttempted })
}

export const captureAuthPromptDismissed = (props: { actionAttempted: string }): void => {
  posthog.capture('account_auth_prompt_dismissed', { action_attempted: props.actionAttempted })
}

export const captureHistorySandwichSaved = (props: { sandwichName: string; savedCount: number }): void => {
  posthog.capture('history_sandwich_saved', { sandwich_name: props.sandwichName, saved_count: props.savedCount })
}

export const captureHistorySandwichRated = (props: { rating: number; previousRating: number | null; sandwichName: string }): void => {
  posthog.capture('history_sandwich_rated', { rating: props.rating, previous_rating: props.previousRating, sandwich_name: props.sandwichName })
}

export const captureHistorySandwichFavorited = (props: { sandwichName: string; totalFavorites: number }): void => {
  posthog.capture('history_sandwich_favorited', { sandwich_name: props.sandwichName, total_favorites: props.totalFavorites })
}

export const captureHistorySandwichUnfavorited = (props: { sandwichName: string }): void => {
  posthog.capture('history_sandwich_unfavorited', { sandwich_name: props.sandwichName })
}

export const captureHistorySandwichDeleted = (): void => {
  posthog.capture('history_sandwich_deleted')
}

export const captureHistoryCleared = (props: { deletedCount: number; includedFavorites: boolean }): void => {
  posthog.capture('history_cleared', { deleted_count: props.deletedCount, included_favorites: props.includedFavorites })
}

export const captureHistoryViewed = (): void => {
  posthog.capture('history_viewed')
}

export const captureHistorySearched = (props: { query: string; resultsCount: number; filtersApplied: string[] }): void => {
  posthog.capture('history_searched', { query: props.query, results_count: props.resultsCount, filters_applied: props.filtersApplied })
}

export const captureEncyclopediaViewed = (): void => {
  posthog.capture('encyclopedia_viewed')
}

export const captureEncyclopediaEntryViewed = (props: { slug: string }): void => {
  posthog.capture('encyclopedia_entry_viewed', { slug: props.slug })
}

export const captureEncyclopediaSearched = (props: { query: string; resultsCount: number }): void => {
  posthog.capture('encyclopedia_searched', { query: props.query, results_count: props.resultsCount })
}

export const captureEncyclopediaFiltered = (props: { region: string | null; diet: string[]; sort: string }): void => {
  posthog.capture('encyclopedia_filtered', { region: props.region, diet: props.diet, sort: props.sort })
}

export const captureEncyclopediaTryThisClicked = (props: { slug: string }): void => {
  posthog.capture('encyclopedia_try_this_clicked', { slug: props.slug })
}

export const captureCommunityViewed = (): void => {
  posthog.capture('community_viewed')
}

export const captureCommunityEntryViewed = (props: { slug: string }): void => {
  posthog.capture('community_entry_viewed', { slug: props.slug })
}

export const captureCommunitySorted = (props: { sort: string }): void => {
  posthog.capture('community_sorted', { sort: props.sort })
}

export const captureCommunityFiltered = (props: { diet: string[]; ingredient: string | null; sort: string }): void => {
  posthog.capture('community_filtered', { diet: props.diet, ingredient: props.ingredient, sort: props.sort })
}

export const captureCommunityTryThisClicked = (props: { slug: string }): void => {
  posthog.capture('community_try_this_clicked', { slug: props.slug })
}

type ContributionTarget = 'database' | 'community' | 'blog'

export const captureSandwichRated = (props: { targetType: ContributionTarget; slug: string; score: number }): void => {
  posthog.capture('sandwich_rated', { target_type: props.targetType, slug: props.slug, score: props.score })
}

export const captureCommentPosted = (props: { targetType: ContributionTarget; slug: string; isReply: boolean }): void => {
  posthog.capture('comment_posted', { target_type: props.targetType, slug: props.slug, is_reply: props.isReply })
}

export const capturePhotoUploaded = (props: { targetType: ContributionTarget; slug: string }): void => {
  posthog.capture('photo_uploaded', { target_type: props.targetType, slug: props.slug })
}

type SearchSurface = 'header' | 'page'

export const captureSearchPerformed = (props: {
  query: string
  source: string
  resultsCount: number
  surface: SearchSurface
}): void => {
  posthog.capture('search_performed', {
    query: props.query,
    source: props.source,
    results_count: props.resultsCount,
    surface: props.surface,
  })
}

export const captureSearchResultClicked = (props: {
  query: string
  resultSource: string
  slug: string
  position: number
  surface: SearchSurface
}): void => {
  posthog.capture('search_result_clicked', {
    query: props.query,
    result_source: props.resultSource,
    slug: props.slug,
    position: props.position,
    surface: props.surface,
  })
}

export const captureSearchHeaderOpened = (): void => {
  posthog.capture('search_header_opened')
}

export const captureSearchHeaderClosed = (): void => {
  posthog.capture('search_header_closed')
}

export const captureBlogViewed = (): void => {
  posthog.capture('blog_viewed')
}

export const captureBlogCategorySelected = (props: { category: string }): void => {
  posthog.capture('blog_category_selected', { category: props.category })
}

export const captureBlogPostViewed = (props: { slug: string; categories: string[] }): void => {
  posthog.capture('blog_post_viewed', { slug: props.slug, categories: props.categories })
}

export const captureBlogPostShared = (props: { slug: string }): void => {
  posthog.capture('blog_post_shared', { slug: props.slug })
}

export const captureBlogRelatedSandwichClicked = (props: { postSlug: string; sandwichSlug: string }): void => {
  posthog.capture('blog_related_sandwich_clicked', { post_slug: props.postSlug, sandwich_slug: props.sandwichSlug })
}

export const captureAccountSignedUp = (props: { method: string }): void => {
  posthog.capture('account_signed_up', { method: props.method })
}

export const captureAccountLoggedIn = (props: { method: string }): void => {
  posthog.capture('account_logged_in', { method: props.method })
}

export const captureAccountLoggedOut = (): void => {
  posthog.capture('account_logged_out')
}

export const captureAccountDeleted = (): void => {
  posthog.capture('account_deleted')
}

export const identifyUser = (props: {
  userId: string
  email: string
  signupMethod: string
  signupDate: string
  signupTrigger?: string
}): void => {
  const properties: Record<string, string> = {
    email: props.email,
    signup_method: props.signupMethod,
    signup_date: props.signupDate,
  }
  if (props.signupTrigger !== undefined) {
    properties.signup_trigger = props.signupTrigger
  }
  posthog.identify(props.userId, properties)
}

export const resetIdentity = (): void => {
  posthog.reset()
}
