import type { Ingredient } from '@/types'
import { getEnabledIngredients } from '@/data/ingredients'
import { useCyclingText } from '@/hooks/useCyclingText'

const chefPool = getEnabledIngredients('chefs-special')

type Props = {
  chefsSpecial: Ingredient[] | null
  isRolling: boolean
}

export default function ChefSpecialRow({ chefsSpecial, isRolling }: Props) {
  const displayText = useCyclingText({
    isRolling,
    selection: chefsSpecial ?? [],
    pool: chefPool,
  })

  if (chefsSpecial === null) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-chefs-special bg-chefs-special-light px-4 py-3 text-chefs-special animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-xl" aria-hidden="true">👨‍🍳</span>
      <span className="min-w-[80px] text-sm font-semibold">Chef&apos;s Special</span>
      <span className={`flex-1 text-sm ${isRolling ? 'font-medium text-neutral-800 opacity-70' : 'font-medium text-neutral-800'}`}>
        {displayText}
      </span>
    </div>
  )
}
