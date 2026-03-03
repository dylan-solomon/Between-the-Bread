import posthog from 'posthog-js'

export const captureRolledAll = (props: {
  rollNumber: number
  lockedCategories: string[]
}): void => {
  posthog.capture('generator_rolled_all', {
    roll_number: props.rollNumber,
    locked_categories: props.lockedCategories,
    smart_mode: false,
    active_dietary_filters: [],
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
    smart_mode: false,
    active_dietary_filters: [],
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
