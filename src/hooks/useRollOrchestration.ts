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
      setRollingCategory(slug)

      setTimeout(() => {
        const pool = getEnabledIngredients(slug)
        const result = rollCategory(slug, pool, pickCount(slug, session.doubleCategories))
        const prior = session.composition
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

    const pools = buildPools()
    const prior = session.composition
    const results = new Map<BaseCategory, Ingredient[]>()

    // Set first category immediately so UI is in sync from the first render
    setRollingCategory(BASE_CATEGORIES[0] ?? null)

    BASE_CATEGORIES.forEach((slug, index) => {
      const delay = index * (CATEGORY_DURATION + STAGGER_MS)

      if (index > 0) {
        setTimeout(() => { setRollingCategory(slug) }, delay)
      }

      setTimeout(() => {
        const result = session.lockedCategories.has(slug)
          ? (prior?.[slug] ?? rollCategory(slug, pools[slug]))
          : rollCategory(slug, pools[slug], pickCount(slug, session.doubleCategories))
        results.set(slug, result)

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
