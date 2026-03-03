import { useState } from 'react'
import type { HistoryEntry } from '@/types'

type Props = {
  entries: readonly HistoryEntry[]
  onLoad: (entry: HistoryEntry) => void
}

export default function SessionHistory({ entries, onLoad }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (entries.length === 0) return null

  return (
    <div className="text-center">
      <button
        aria-expanded={isOpen}
        onClick={() => { setIsOpen((v) => !v) }}
        className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        History ({entries.length})
      </button>

      {isOpen && (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm"
            >
              <span className="font-medium text-neutral-800">{entry.name}</span>
              <button
                onClick={() => { onLoad(entry) }}
                className="ml-4 text-xs font-semibold text-primary hover:underline"
              >
                Load
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
