import { useMemo } from 'react'
import AppShell from '@/components/AppShell'
import CategoryList from '@/components/CategoryList'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import RollAllButton from '@/components/RollAllButton'
import SandwichVisual from '@/components/SandwichVisual'
import SessionHistory from '@/components/SessionHistory'
import SummaryCard from '@/components/SummaryCard'
import { useSandwichSession } from '@/hooks/useSandwichSession'
import { useSessionHistory } from '@/hooks/useSessionHistory'
import { useRollOrchestration } from '@/hooks/useRollOrchestration'
import { useIngredients } from '@/hooks/useIngredients'
import type { CategorySlug, Ingredient } from '@/types'

const EMPTY_POOLS: Partial<Record<CategorySlug, Ingredient[]>> = {}

export default function HomePage() {
  const { pools, categories, loading } = useIngredients()
  const session = useSandwichSession()
  const history = useSessionHistory()

  const activePools = useMemo(() => (loading ? EMPTY_POOLS : pools), [loading, pools])

  const { isRolling, rollingCategory, chefsSpecial, rollAll, rollOne, loadFromHistory } =
    useRollOrchestration({ ...session, addHistoryEntry: history.addEntry }, activePools, categories)

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-8 flex flex-col gap-6">
        <div className={session.composition !== null && !isRolling ? 'animate-float' : undefined}>
          <SandwichVisual composition={session.composition} />
        </div>

        <div className="min-h-20">
          {!isRolling && <SummaryCard composition={session.composition} />}
        </div>

        <RollAllButton
          hasRolled={session.hasRolled}
          isRolling={isRolling}
          disabled={loading}
          onClick={rollAll}
        />

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
