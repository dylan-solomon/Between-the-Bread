import { getCategories, getEnabledIngredients } from '@/data/ingredients'
import { BASE_CATEGORIES } from '@/engine/randomizer'
import type { BaseCategory } from '@/engine/randomizer'
import type { DoubleCategory, SandwichComposition } from '@/types'
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
}

const baseCategories = getCategories()
  .filter((c) => BASE_CATEGORIES.includes(c.slug as (typeof BASE_CATEGORIES)[number]))
  .sort((a, b) => a.display_order - b.display_order)

const categoryPools = Object.fromEntries(
  BASE_CATEGORIES.map((slug) => [slug, getEnabledIngredients(slug)]),
) as Record<BaseCategory, ReturnType<typeof getEnabledIngredients>>

export default function CategoryList({
  composition,
  lockedCategories,
  doubleCategories,
  isRolling,
  rollingCategory,
  onToggleLock,
  onToggleDouble,
  onRoll,
}: Props) {
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
            cyclingPool={categoryPools[slug]}
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
