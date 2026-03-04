import { useState, useCallback, useRef } from 'react'
import type { Category, CategorySlug, DoubleCategory, Ingredient, SandwichComposition } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'
import { BASE_CATEGORIES, rollCategory } from '@/engine/randomizer'
import { generateSandwichName } from '@/engine/naming'
import {
  captureRolledAll,
  captureRolledCategory,
  captureSandwichCompleted,
  captureChefSpecialTriggered,
} from '@/analytics/events'

const CYCLE_MS = 80
const CYCLES = 8
const CATEGORY_DURATION = CYCLE_MS * CYCLES  // 640ms
const STAGGER_MS = 200

type Session = {
  composition: SandwichComposition | null
  lockedCategories: ReadonlySet<BaseCategory>
  doubleCategories: ReadonlySet<DoubleCategory>
  setComposition: (c: SandwichComposition) => void
  addHistoryEntry: (composition: SandwichComposition, name: string) => void
  loadComposition: (c: SandwichComposition) => void
}

type RollOrchestration = {
  isRolling: boolean
  rollingCategory: BaseCategory | null
  chefsSpecial: Ingredient[] | null
  rollAll: () => void
  rollOne: (slug: BaseCategory) => void
  loadFromHistory: (composition: SandwichComposition) => void
}

const filterTriggers = (ingredients: Ingredient[]): Ingredient[] =>
  ingredients.filter((i) => !i.is_trigger)

const applyTriggerLogic = (
  selections: Record<BaseCategory, Ingredient[]>,
  chefsSpecialPool: Ingredient[],
): { cleaned: Record<BaseCategory, Ingredient[]>; chefsSpecialPool: Ingredient[] | null; triggerSlug: string | null } => {
  const toppings = selections.toppings
  const trigger = toppings.find((i) => i.is_trigger)
  if (!trigger) {
    return { cleaned: selections, chefsSpecialPool: null, triggerSlug: null }
  }
  const cleaned = { ...selections, toppings: filterTriggers(toppings) }
  return { cleaned, chefsSpecialPool, triggerSlug: trigger.slug }
}

const pickCount = (
  slug: BaseCategory,
  doubleCategories: ReadonlySet<DoubleCategory>,
): number | undefined =>
  (slug === 'protein' || slug === 'cheese') && doubleCategories.has(slug) ? 2 : undefined

export const useRollOrchestration = (
  session: Session,
  pools: Partial<Record<CategorySlug, Ingredient[]>>,
  categories: Category[],
): RollOrchestration => {
  const [isRolling, setIsRolling] = useState(false)
  const [rollingCategory, setRollingCategory] = useState<BaseCategory | null>(null)
  const [chefsSpecial, setChefsSpecial] = useState<Ingredient[] | null>(null)
  // Ref mirrors chefsSpecial state so resolveAndCommit (a stale callback) can read the latest value
  const chefsSpecialRef = useRef<Ingredient[] | null>(null)
  const rollingRef = useRef(false)
  const rollAllCountRef = useRef(0)
  const rollOneCounts = useRef<Partial<Record<BaseCategory, number>>>({})

  // resolveAndCommit accepts rolledToppings so it knows whether to re-roll the chef's special
  // or preserve the existing one (when toppings wasn't part of this roll).
  const resolveAndCommit = useCallback(
    (selections: Record<BaseCategory, Ingredient[]>, rolledToppings: boolean) => {
      const { cleaned, chefsSpecialPool: specialPool, triggerSlug } = applyTriggerLogic(
        selections,
        pools['chefs-special'] ?? [],
      )

      // Only re-roll the chef's special when toppings was part of this roll.
      // When rolling a non-toppings category, the trigger topping is still active and
      // the same chef's special ingredient should be preserved.
      const specialRoll = (() => {
        if (specialPool === null || specialPool.length === 0) return null
        if (rolledToppings) return rollCategory('chefs-special', specialPool, { categories })
        return chefsSpecialRef.current
      })()

      setChefsSpecial(specialRoll)
      chefsSpecialRef.current = specialRoll

      // Only fire the analytics event when the trigger was freshly encountered (toppings was rolled)
      if (specialRoll !== null && triggerSlug !== null && rolledToppings) {
        captureChefSpecialTriggered({
          chefsSpecialIngredient: specialRoll[0]?.slug ?? '',
          triggerTopping: triggerSlug,
          toppingCount: cleaned.toppings.length,
        })
      }

      const isComplete = BASE_CATEGORIES.every((s) => cleaned[s].length > 0)
      if (isComplete) {
        const name = generateSandwichName(cleaned)
        const totalRolls =
          rollAllCountRef.current +
          Object.values(rollOneCounts.current).reduce((a, b) => a + b, 0)
        captureSandwichCompleted({
          sandwichName: name,
          bread: cleaned.bread.map((i) => i.slug),
          protein: cleaned.protein.map((i) => i.slug),
          cheese: cleaned.cheese.map((i) => i.slug),
          toppings: cleaned.toppings.map((i) => i.slug),
          condiments: cleaned.condiments.map((i) => i.slug),
          chefsSpecial: specialRoll?.[0]?.slug ?? null,
          totalRolls,
        })
      }

      const composition: SandwichComposition = {
        ...cleaned,
        ...(specialRoll !== null ? { 'chefs-special': specialRoll } : {}),
      }
      const name = generateSandwichName(cleaned)
      session.addHistoryEntry(composition, name)
      session.setComposition(composition)
      setIsRolling(false)
      setRollingCategory(null)
      rollingRef.current = false
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.setComposition, session.addHistoryEntry, pools, categories],
  )

  const rollOne = useCallback(
    (slug: BaseCategory) => {
      if (rollingRef.current || session.lockedCategories.has(slug)) return
      rollingRef.current = true
      setIsRolling(true)
      // Only clear chefsSpecial when re-rolling toppings — rolling any other category
      // should leave the chef's special visible during animation.
      if (slug === 'toppings') {
        setChefsSpecial(null)
        chefsSpecialRef.current = null
      }
      setRollingCategory(slug)

      const prior = session.composition
      // On re-roll, clear the rolling category immediately so old selection doesn't show during animation
      if (prior !== null) { session.setComposition({ ...prior, [slug]: [] }) }

      setTimeout(() => {
        const pool = pools[slug] ?? []
        const result = rollCategory(slug, pool, { categories, count: pickCount(slug, session.doubleCategories) })
        const newCount = (rollOneCounts.current[slug] ?? 0) + 1
        rollOneCounts.current[slug] = newCount
        captureRolledCategory({
          category: slug,
          rollNumber: newCount,
          previousIngredient: prior?.[slug].at(0)?.slug ?? null,
          newIngredient: result.at(0)?.slug ?? '',
        })
        const selections: Record<BaseCategory, Ingredient[]> = {
          bread:      prior?.bread      ?? [],
          protein:    prior?.protein    ?? [],
          cheese:     prior?.cheese     ?? [],
          toppings:   prior?.toppings   ?? [],
          condiments: prior?.condiments ?? [],
          [slug]:     result,
        }
        resolveAndCommit(selections, slug === 'toppings')
      }, CATEGORY_DURATION + STAGGER_MS)
    },
    [session, pools, categories, resolveAndCommit],
  )

  const rollAllCategories = useCallback(() => {
    if (rollingRef.current) return
    rollingRef.current = true
    setIsRolling(true)
    setChefsSpecial(null)
    chefsSpecialRef.current = null

    rollAllCountRef.current++
    captureRolledAll({
      rollNumber: rollAllCountRef.current,
      lockedCategories: [...session.lockedCategories],
    })

    const prior = session.composition
    const results = new Map<BaseCategory, Ingredient[]>()

    // Locked categories keep their current selection; unlocked start empty (cleared immediately)
    const running: Record<BaseCategory, Ingredient[]> = {
      bread:      session.lockedCategories.has('bread')      ? (prior?.bread      ?? []) : [],
      protein:    session.lockedCategories.has('protein')    ? (prior?.protein    ?? []) : [],
      cheese:     session.lockedCategories.has('cheese')     ? (prior?.cheese     ?? []) : [],
      toppings:   session.lockedCategories.has('toppings')   ? (prior?.toppings   ?? []) : [],
      condiments: session.lockedCategories.has('condiments') ? (prior?.condiments ?? []) : [],
    }
    // On re-roll, wipe old layers from the visual immediately so they don't show during animation
    if (prior !== null) { session.setComposition({ ...running }) }

    // Only animate unlocked categories — locked rows stay static throughout the roll
    const firstUnlocked = BASE_CATEGORIES.find((s) => !session.lockedCategories.has(s))
    setRollingCategory(firstUnlocked ?? null)

    // animSlot counts only unlocked categories so locked ones don't consume stagger time
    let animSlot = 0

    BASE_CATEGORIES.forEach((slug) => {
      const isLocked = session.lockedCategories.has(slug)
      const slot = isLocked ? -1 : animSlot
      if (!isLocked) animSlot++

      // Locked categories settle immediately; unlocked use their animation slot for stagger
      const delay = isLocked ? 0 : slot * (CATEGORY_DURATION + STAGGER_MS)

      if (!isLocked && slot > 0) {
        setTimeout(() => { setRollingCategory(slug) }, delay)
      }

      setTimeout(() => {
        const pool = pools[slug] ?? []
        const result = isLocked
          ? (prior?.[slug] ?? rollCategory(slug, pool, { categories }))
          : rollCategory(slug, pool, { categories, count: pickCount(slug, session.doubleCategories) })
        results.set(slug, result)
        running[slug] = result

        // Show this category's result immediately — don't wait for all to finish
        session.setComposition({ ...running })

        if (results.size === BASE_CATEGORIES.length) {
          const full = Object.fromEntries(results) as Record<BaseCategory, Ingredient[]>
          // rollAll always re-rolls the chef's special (it's a full re-randomization)
          resolveAndCommit(full, true)
        }
      }, delay + (isLocked ? 0 : CATEGORY_DURATION))
    })
  }, [session, pools, categories, resolveAndCommit])

  const loadFromHistory = useCallback(
    (composition: SandwichComposition) => {
      const val = composition['chefs-special'] ?? null
      setChefsSpecial(val)
      chefsSpecialRef.current = val
      session.loadComposition(composition)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.loadComposition],
  )

  return {
    isRolling,
    rollingCategory,
    chefsSpecial,
    rollAll: rollAllCategories,
    rollOne,
    loadFromHistory,
  }
}
