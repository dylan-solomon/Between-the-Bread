import AppShell from '@/components/AppShell'
import CategoryList from '@/components/CategoryList'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import RollAllButton from '@/components/RollAllButton'
import SandwichVisual from '@/components/SandwichVisual'
import SummaryCard from '@/components/SummaryCard'
import { useSandwichSession } from '@/hooks/useSandwichSession'
import { useRollOrchestration } from '@/hooks/useRollOrchestration'

export default function HomePage() {
  const session = useSandwichSession()
  const { isRolling, rollingCategory, chefsSpecial, rollAll, rollOne } =
    useRollOrchestration(session)

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-8 flex flex-col gap-6">
        <SandwichVisual composition={session.composition} />

        <SummaryCard composition={session.composition} />

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

        <ChefSpecialRow
          chefsSpecial={chefsSpecial}
          isRolling={isRolling}
        />
      </div>
    </AppShell>
  )
}
