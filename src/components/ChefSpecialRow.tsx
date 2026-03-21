import { Lock, Unlock } from 'lucide-react'
import type { Ingredient } from '@/types'

type Props = {
  chefsSpecial: Ingredient[] | null
  isLocked: boolean
  onToggleLock: () => void
}

export default function ChefSpecialRow({ chefsSpecial, isLocked, onToggleLock }: Props) {
  if (chefsSpecial === null) return null

  const displayText = chefsSpecial.map((i) => i.name).join(' & ')

  return (
    <div className="flex items-center gap-3 rounded-lg border border-chefs-special bg-chefs-special-light px-4 py-3 text-chefs-special animate-slide-up">
      <button
        type="button"
        aria-label={isLocked ? "Unlock Chef's Special" : "Lock Chef's Special"}
        aria-pressed={isLocked}
        onClick={onToggleLock}
        className="flex-shrink-0 rounded p-0.5"
      >
        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>
      <span className="text-xl" aria-hidden="true">👨‍🍳</span>
      <span className="min-w-[80px] text-sm font-semibold">Chef&apos;s Special</span>
      <span className="flex-1 text-sm font-medium text-neutral-800">{displayText}</span>
    </div>
  )
}
