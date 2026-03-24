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

export const captureAccountSignedUp = (props: { method: string }): void => {
  posthog.capture('account_signed_up', { method: props.method })
}

export const captureAccountLoggedIn = (props: { method: string }): void => {
  posthog.capture('account_logged_in', { method: props.method })
}

export const captureAccountLoggedOut = (): void => {
  posthog.capture('account_logged_out')
}

export const identifyUser = (props: {
  userId: string
  email: string
  signupMethod: string
  signupDate: string
}): void => {
  posthog.identify(props.userId, {
    email: props.email,
    signup_method: props.signupMethod,
    signup_date: props.signupDate,
  })
}

export const resetIdentity = (): void => {
  posthog.reset()
}
