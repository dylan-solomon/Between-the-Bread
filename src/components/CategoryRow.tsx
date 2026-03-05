import { Dice5, Lock, Unlock } from 'lucide-react'
import type { Category, CategorySlug, Ingredient } from '@/types'
import { useCyclingText } from '@/hooks/useCyclingText'

const CATEGORY_STYLES: Record<CategorySlug, string> = {
  bread:           'border-bread bg-bread-light text-bread',
  protein:         'border-protein bg-protein-light text-protein',
  cheese:          'border-cheese bg-cheese-light text-cheese',
  toppings:        'border-toppings bg-toppings-light text-toppings',
  condiments:      'border-condiments bg-condiments-light text-condiments',
  'chefs-special': 'border-chefs-special bg-chefs-special-light text-chefs-special',
}

type Props = {
  category: Category
  selection: Ingredient[]
  cyclingPool: Ingredient[]
  isLocked: boolean
  canLock: boolean
  onToggleLock: () => void
  isDouble?: boolean
  onToggleDouble?: () => void
  isRolling: boolean
  onRoll: () => void
}

export default function CategoryRow({
  category,
  selection,
  cyclingPool,
  isLocked,
  canLock,
  onToggleLock,
  isDouble,
  onToggleDouble,
  isRolling,
  onRoll,
}: Props) {
  const accentClasses = CATEGORY_STYLES[category.slug]
  const displayText = useCyclingText({ isRolling, selection, pool: cyclingPool })
  const isEmpty = !isRolling && selection.length === 0
  const effectivePool = cyclingPool.filter((i) => !i.slug.startsWith('no-'))
  const poolEmpty = effectivePool.length === 0 && !isLocked

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${accentClasses}`}>
      <button
        type="button"
        aria-label={isLocked ? 'Unlock category' : 'Lock category'}
        aria-pressed={isLocked}
        onClick={onToggleLock}
        disabled={!canLock}
        className="flex-shrink-0 rounded p-0.5 disabled:opacity-40"
      >
        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>
      <span className="text-xl" aria-hidden="true">{category.emoji}</span>
      <span className="min-w-[80px] text-sm font-semibold">{category.name}</span>
      <span
        className={`flex-1 text-sm transition-opacity ${
          isRolling
            ? 'font-medium text-neutral-800 opacity-70'
            : isEmpty
              ? 'italic opacity-50'
              : 'font-medium text-neutral-800'
        }`}
      >
        {displayText}
      </span>
      {poolEmpty && (
        <span className="text-xs font-medium text-amber-600">No options available</span>
      )}
      {onToggleDouble !== undefined && !poolEmpty && (
        <button
          type="button"
          aria-label={`Two ${category.name}s`}
          aria-pressed={isDouble ?? false}
          onClick={onToggleDouble}
          className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${isDouble === true ? 'opacity-100' : 'opacity-50'}`}
        >
          Two {category.name}s
        </button>
      )}
      <button
        type="button"
        aria-label="Roll this category"
        onClick={onRoll}
        disabled={isLocked || isRolling || poolEmpty}
        className="flex-shrink-0 rounded p-1 disabled:opacity-40"
      >
        <Dice5 size={18} />
      </button>
    </div>
  )
}
