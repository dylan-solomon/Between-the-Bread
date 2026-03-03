import { useState, useCallback, useRef } from 'react'
import type { DoubleCategory, Ingredient, SandwichComposition } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'
import { BASE_CATEGORIES, rollCategory } from '@/engine/randomizer'
import { getEnabledIngredients } from '@/data/ingredients'

const CYCLE_MS = 80
const CYCLES = 8
const CATEGORY_DURATION = CYCLE_MS * CYCLES  // 640ms
const STAGGER_MS = 200

type Session = {
  composition: SandwichComposition | null
  lockedCategories: ReadonlySet<BaseCategory>
  doubleCategories: ReadonlySet<DoubleCategory>
  setComposition: (c: SandwichComposition) => void
}

type RollOrchestration = {
  isRolling: boolean
  rollingCategory: BaseCategory | null
  chefsSpecial: Ingredient[] | null
  rollAll: () => void
  rollOne: (slug: BaseCategory) => void
}

const buildPools = (): Record<BaseCategory, Ingredient[]> =>
  Object.fromEntries(
    BASE_CATEGORIES.map((slug) => [slug, getEnabledIngredients(slug)]),
  ) as Record<BaseCategory, Ingredient[]>

const filterTriggers = (ingredients: Ingredient[]): Ingredient[] =>
  ingredients.filter((i) => !i.is_trigger)

const hasTrigger = (ingredients: Ingredient[]): boolean =>
  ingredients.some((i) => i.is_trigger)

const applyTriggerLogic = (
  selections: Record<BaseCategory, Ingredient[]>,
): { cleaned: Record<BaseCategory, Ingredient[]>; chefsSpecialPool: Ingredient[] | null } => {
  const toppings = selections.toppings
  if (!hasTrigger(toppings)) {
    return { cleaned: selections, chefsSpecialPool: null }
  }
  const cleaned = { ...selections, toppings: filterTriggers(toppings) }
  return { cleaned, chefsSpecialPool: getEnabledIngredients('chefs-special') }
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

  const resolveAndCommit = useCallback(
    (selections: Record<BaseCategory, Ingredient[]>) => {
      const { cleaned, chefsSpecialPool } = applyTriggerLogic(selections)
      const specialRoll =
        chefsSpecialPool !== null && chefsSpecialPool.length > 0
          ? rollCategory('chefs-special', chefsSpecialPool)
          : null
      setChefsSpecial(specialRoll)
      const composition: SandwichComposition = {
        ...cleaned,
        ...(specialRoll !== null ? { 'chefs-special': specialRoll } : {}),
      }
      session.setComposition(composition)
      setIsRolling(false)
      setRollingCategory(null)
      rollingRef.current = false
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.setComposition],
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

    BASE_CATEGORIES.forEach((slug, index) => {
      const isLocked = session.lockedCategories.has(slug)
      const delay = index * (CATEGORY_DURATION + STAGGER_MS)

      if (index > 0 && !isLocked) {
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
      }, delay + CATEGORY_DURATION)
    })
  }, [session, resolveAndCommit])

  return {
    isRolling,
    rollingCategory,
    chefsSpecial,
    rollAll: rollAllCategories,
    rollOne,
  }
}
