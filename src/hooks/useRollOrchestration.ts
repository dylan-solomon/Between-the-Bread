import { useState, useCallback, useRef } from 'react'
import type { DoubleCategory, Ingredient, SandwichComposition } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'
import { BASE_CATEGORIES, rollCategory } from '@/engine/randomizer'
import { getEnabledIngredients } from '@/data/ingredients'
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

const buildPools = (): Record<BaseCategory, Ingredient[]> =>
  Object.fromEntries(
    BASE_CATEGORIES.map((slug) => [slug, getEnabledIngredients(slug)]),
  ) as Record<BaseCategory, Ingredient[]>

const filterTriggers = (ingredients: Ingredient[]): Ingredient[] =>
  ingredients.filter((i) => !i.is_trigger)

const applyTriggerLogic = (
  selections: Record<BaseCategory, Ingredient[]>,
): { cleaned: Record<BaseCategory, Ingredient[]>; chefsSpecialPool: Ingredient[] | null; triggerSlug: string | null } => {
  const toppings = selections.toppings
  const trigger = toppings.find((i) => i.is_trigger)
  if (!trigger) {
    return { cleaned: selections, chefsSpecialPool: null, triggerSlug: null }
  }
  const cleaned = { ...selections, toppings: filterTriggers(toppings) }
  return { cleaned, chefsSpecialPool: getEnabledIngredients('chefs-special'), triggerSlug: trigger.slug }
}

const pickCount = (
  slug: BaseCategory,
  doubleCategories: ReadonlySet<DoubleCategory>,
): number | undefined =>
  (slug === 'protein' || slug === 'cheese') && doubleCategories.has(slug) ? 2 : undefined

export const useRollOrchestration = (session: Session): RollOrchestration => {
  const [isRolling, setIsRolling] = useState(false)
  const [rollingCategory, setRollingCategory] = useState<BaseCategory | null>(null)
  const [chefsSpecial, setChefsSpecial] = useState<Ingredient[] | null>(null)
  const rollingRef = useRef(false)
  const rollAllCountRef = useRef(0)
  const rollOneCounts = useRef<Partial<Record<BaseCategory, number>>>({})

  const resolveAndCommit = useCallback(
    (selections: Record<BaseCategory, Ingredient[]>) => {
      const { cleaned, chefsSpecialPool, triggerSlug } = applyTriggerLogic(selections)
      const specialRoll =
        chefsSpecialPool !== null && chefsSpecialPool.length > 0
          ? rollCategory('chefs-special', chefsSpecialPool)
          : null
      setChefsSpecial(specialRoll)

      if (specialRoll !== null && triggerSlug !== null) {
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
    [session.setComposition, session.addHistoryEntry],
  )

  const rollOne = useCallback(
    (slug: BaseCategory) => {
      if (rollingRef.current || session.lockedCategories.has(slug)) return
      rollingRef.current = true
      setIsRolling(true)
      setChefsSpecial(null)
      setRollingCategory(slug)

      const prior = session.composition
      // On re-roll, clear the rolling category immediately so old selection doesn't show during animation
      if (prior !== null) { session.setComposition({ ...prior, [slug]: [] }) }

      setTimeout(() => {
        const pool = getEnabledIngredients(slug)
        const result = rollCategory(slug, pool, pickCount(slug, session.doubleCategories))
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
        resolveAndCommit(selections)
      }, CATEGORY_DURATION + STAGGER_MS)
    },
    [session, resolveAndCommit],
  )

  const rollAllCategories = useCallback(() => {
    if (rollingRef.current) return
    rollingRef.current = true
    setIsRolling(true)
    setChefsSpecial(null)

    rollAllCountRef.current++
    captureRolledAll({
      rollNumber: rollAllCountRef.current,
      lockedCategories: [...session.lockedCategories],
    })

    const pools = buildPools()
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
        const result = isLocked
          ? (prior?.[slug] ?? rollCategory(slug, pools[slug]))
          : rollCategory(slug, pools[slug], pickCount(slug, session.doubleCategories))
        results.set(slug, result)
        running[slug] = result

        // Show this category's result immediately — don't wait for all to finish
        session.setComposition({ ...running })

        if (results.size === BASE_CATEGORIES.length) {
          const full = Object.fromEntries(results) as Record<BaseCategory, Ingredient[]>
          resolveAndCommit(full)
        }
      }, delay + (isLocked ? 0 : CATEGORY_DURATION))
    })
  }, [session, resolveAndCommit])

  const loadFromHistory = useCallback(
    (composition: SandwichComposition) => {
      setChefsSpecial(composition['chefs-special'] ?? null)
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
