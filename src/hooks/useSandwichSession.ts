import { useState, useCallback } from 'react'
import type { DoubleCategory, SandwichComposition } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'
import { captureLockedCategory, captureUnlockedCategory } from '@/analytics/events'

export type SandwichSession = {
  composition: SandwichComposition | null
  lockedCategories: ReadonlySet<BaseCategory>
  doubleCategories: ReadonlySet<DoubleCategory>
  hasRolled: boolean
  setComposition: (composition: SandwichComposition) => void
  loadComposition: (composition: SandwichComposition) => void
  toggleLock: (category: BaseCategory) => void
  toggleDouble: (category: DoubleCategory) => void
  isLocked: (category: BaseCategory) => boolean
  isDouble: (category: DoubleCategory) => boolean
  canLock: (category: BaseCategory) => boolean
}

export const useSandwichSession = (): SandwichSession => {
  const [composition, setCompositionState] = useState<SandwichComposition | null>(null)
  const [lockedCategories, setLockedCategories] = useState<ReadonlySet<BaseCategory>>(new Set())
  const [doubleCategories, setDoubleCategories] = useState<ReadonlySet<DoubleCategory>>(new Set())

  const setComposition = useCallback((next: SandwichComposition) => {
    setCompositionState(next)
  }, [])

  const loadComposition = useCallback((next: SandwichComposition) => {
    setCompositionState(next)
    setLockedCategories(new Set())
  }, [])

  const canLock = useCallback(
    (category: BaseCategory): boolean => composition !== null && composition[category].length > 0,
    [composition],
  )

  const toggleLock = useCallback(
    (category: BaseCategory) => {
      if (composition === null) return
      const willLock = !lockedCategories.has(category)
      if (willLock) {
        captureLockedCategory({ category, lockedIngredient: composition[category][0]?.slug ?? '' })
      } else {
        captureUnlockedCategory({ category })
      }
      setLockedCategories((prev) => {
        const next = new Set(prev)
        if (next.has(category)) {
          next.delete(category)
        } else {
          next.add(category)
        }
        return next
      })
    },
    [composition, lockedCategories],
  )

  const toggleDouble = useCallback((category: DoubleCategory) => {
    setDoubleCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const isLocked = useCallback(
    (category: BaseCategory): boolean => lockedCategories.has(category),
    [lockedCategories],
  )

  const isDouble = useCallback(
    (category: DoubleCategory): boolean => doubleCategories.has(category),
    [doubleCategories],
  )

  return {
    composition,
    lockedCategories,
    doubleCategories,
    hasRolled: composition !== null,
    setComposition,
    loadComposition,
    toggleLock,
    toggleDouble,
    isLocked,
    isDouble,
    canLock,
  }
}
