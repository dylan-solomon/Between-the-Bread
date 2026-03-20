import { useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import CategoryList from '@/components/CategoryList'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import DietaryFilters from '@/components/DietaryFilters'
import RollAllButton from '@/components/RollAllButton'
import SandwichVisual from '@/components/SandwichVisual'
import SessionHistory from '@/components/SessionHistory'
import SmartModeToggle from '@/components/SmartModeToggle'
import SummaryCard from '@/components/SummaryCard'
import { useSandwichSession } from '@/hooks/useSandwichSession'
import { useSessionHistory } from '@/hooks/useSessionHistory'
import { useRollOrchestration } from '@/hooks/useRollOrchestration'
import { useIngredients } from '@/hooks/useIngredients'
import { useCompatMatrix } from '@/hooks/useCompatMatrix'
import { filterByDiet } from '@/utils/dietary'
import { BASE_CATEGORIES } from '@/engine/randomizer'
import {
  captureDietaryFilterToggled,
  captureDietaryFilterWarning,
  captureSmartModeToggled,
} from '@/analytics/events'
import type { CategorySlug, DietaryTag, Ingredient } from '@/types'

const EMPTY_POOLS: Partial<Record<CategorySlug, Ingredient[]>> = {}

export default function HomePage() {
  const { pools, categories, costDataLastUpdated, loading } = useIngredients()
  const { matrix } = useCompatMatrix()
  const session = useSandwichSession()
  const history = useSessionHistory()
  const [activeDietFilters, setActiveDietFilters] = useState<DietaryTag[]>([])
  const [smartMode, setSmartMode] = useState(false)

  const toggleDietFilter = (tag: DietaryTag) => {
    setActiveDietFilters((prev) => {
      const isActive = !prev.includes(tag)
      const newFilters = isActive ? [...prev, tag] : prev.filter((t) => t !== tag)
      captureDietaryFilterToggled({ tag, isActive, activeFilters: newFilters })
      if (newFilters.length > 0) {
        const emptyCategories = BASE_CATEGORIES.filter(
          (slug) => filterByDiet(pools[slug] ?? [], newFilters).length === 0,
        )
        if (emptyCategories.length > 0) {
          captureDietaryFilterWarning({ tag, affectedCategories: emptyCategories })
        }
      }
      return newFilters
    })
  }

  const activePools = useMemo(() => {
    if (loading) return EMPTY_POOLS
    if (activeDietFilters.length === 0) return pools
    return Object.fromEntries(
      Object.entries(pools).map(([slug, pool]) => [slug, filterByDiet(pool, activeDietFilters)]),
    ) as Partial<Record<CategorySlug, Ingredient[]>>
  }, [loading, pools, activeDietFilters])

  const toggleSmartMode = (next: boolean) => {
    setSmartMode(next)
    captureSmartModeToggled({ isActive: next })
  }

  const { isRolling, rollingCategory, chefsSpecial, rollAll, rollOne, loadFromHistory } =
    useRollOrchestration(
      { ...session, addHistoryEntry: history.addEntry },
      activePools,
      categories,
      activeDietFilters,
      smartMode,
      matrix,
    )

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-8 flex flex-col gap-6">
        <div className={session.composition !== null && !isRolling ? 'animate-float' : undefined}>
          <SandwichVisual composition={session.composition} />
        </div>

        <div className="min-h-20">
          {!isRolling && <SummaryCard composition={session.composition} costDataLastUpdated={costDataLastUpdated} />}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <DietaryFilters activeTags={activeDietFilters} onToggle={toggleDietFilter} />
        </div>

        <RollAllButton
          hasRolled={session.hasRolled}
          isRolling={isRolling}
          disabled={loading}
          onClick={rollAll}
        />

        <div className="flex justify-center">
          <SmartModeToggle isActive={smartMode} onToggle={toggleSmartMode} />
        </div>

        <CategoryList
          composition={session.composition}
          lockedCategories={session.lockedCategories}
          doubleCategories={session.doubleCategories}
          isRolling={isRolling}
          rollingCategory={rollingCategory}
          onToggleLock={session.toggleLock}
          onToggleDouble={session.toggleDouble}
          onRoll={rollOne}
          categories={categories}
          pools={activePools}
        />

        <ChefSpecialRow chefsSpecial={chefsSpecial} />

        <SessionHistory
          entries={history.entries}
          onLoad={(entry) => { loadFromHistory(entry.composition) }}
        />
      </div>
    </AppShell>
  )
}
