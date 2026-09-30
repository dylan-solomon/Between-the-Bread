import type { DietaryTag } from '@/types'
import { DIETARY_DISCLAIMER, DIETARY_TAGS } from '@/data/dietaryTags'

type Props = {
  activeTags: DietaryTag[]
  onToggle: (tag: DietaryTag) => void
}

export default function DietaryFilters({ activeTags, onToggle }: Props) {
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {DIETARY_TAGS.map(({ tag, filterLabel }) => {
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
              {filterLabel}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">{DIETARY_DISCLAIMER}</p>
    </div>
  )
}
