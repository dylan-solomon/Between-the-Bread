import { BASE_CATEGORIES } from '@/engine/randomizer'
import type { BaseCategory } from '@/engine/randomizer'
import type { Category, CategorySlug, DoubleCategory, Ingredient, SandwichComposition } from '@/types'
import CategoryRow from '@/components/CategoryRow'

const DOUBLE_CATEGORIES = new Set<BaseCategory>(['protein', 'cheese'])

type Props = {
  composition: SandwichComposition | null
  lockedCategories: ReadonlySet<BaseCategory>
  doubleCategories: ReadonlySet<DoubleCategory>
  isRolling: boolean
  rollingCategory: BaseCategory | null
  onToggleLock: (slug: BaseCategory) => void
  onToggleDouble: (slug: DoubleCategory) => void
  onRoll: (slug: BaseCategory) => void
  categories: Category[]
  pools: Partial<Record<CategorySlug, Ingredient[]>>
}

export default function CategoryList({
  composition,
  lockedCategories,
  doubleCategories,
  isRolling,
  rollingCategory,
  onToggleLock,
  onToggleDouble,
  onRoll,
  categories,
  pools,
}: Props) {
  const baseCategories = categories
    .filter((c) => BASE_CATEGORIES.includes(c.slug as (typeof BASE_CATEGORIES)[number]))
    .sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="flex flex-col gap-2">
      {baseCategories.map((category) => {
        const slug = category.slug as BaseCategory
        const isDoubleCategory = DOUBLE_CATEGORIES.has(slug)
        return (
          <CategoryRow
            key={slug}
            category={category}
            selection={composition?.[slug] ?? []}
            cyclingPool={pools[slug] ?? []}
            isLocked={lockedCategories.has(slug)}
            canLock={composition !== null}
            onToggleLock={() => { onToggleLock(slug) }}
            isDouble={isDoubleCategory ? doubleCategories.has(slug as DoubleCategory) : undefined}
            onToggleDouble={isDoubleCategory ? () => { onToggleDouble(slug as DoubleCategory) } : undefined}
            isRolling={isRolling && rollingCategory === slug}
            onRoll={() => { onRoll(slug) }}
          />
        )
      })}
    </div>
  )
}
