import type { DietaryTag } from '@/types'

type FilterOption = {
  tag: DietaryTag
  label: string
}

const FILTERS: FilterOption[] = [
  { tag: 'vegetarian', label: 'Vegetarian' },
  { tag: 'vegan',      label: 'Vegan' },
  { tag: 'gluten_free', label: 'Gluten-Free' },
  { tag: 'dairy_free',  label: 'Dairy-Free' },
]

type Props = {
  activeTags: DietaryTag[]
  onToggle: (tag: DietaryTag) => void
}

export default function DietaryFilters({ activeTags, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ tag, label }) => {
        const isActive = activeTags.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isActive}
            onClick={() => { onToggle(tag) }}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
