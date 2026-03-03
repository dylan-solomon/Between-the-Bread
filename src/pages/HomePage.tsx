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

export default function HomePage() {
  const session = useSandwichSession()
  const history = useSessionHistory()
  const { isRolling, rollingCategory, chefsSpecial, rollAll, rollOne } =
    useRollOrchestration({ ...session, addHistoryEntry: history.addEntry })

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
        />

        <ChefSpecialRow chefsSpecial={chefsSpecial} />

        <SessionHistory
          entries={history.entries}
          onLoad={(entry) => { session.loadComposition(entry.composition) }}
        />
      </div>
    </AppShell>
  )
}
