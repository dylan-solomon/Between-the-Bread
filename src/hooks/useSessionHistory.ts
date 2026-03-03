import { useState, useCallback } from 'react'
import type { HistoryEntry, SandwichComposition } from '@/types'

const MAX_ENTRIES = 20

export type SessionHistory = {
  entries: readonly HistoryEntry[]
  addEntry: (composition: SandwichComposition, name: string) => void
}

export const useSessionHistory = (): SessionHistory => {
  const [entries, setEntries] = useState<readonly HistoryEntry[]>([])

  const addEntry = useCallback((composition: SandwichComposition, name: string) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      composition,
      name,
      timestamp: new Date(),
    }
    setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES))
  }, [])

  return { entries, addEntry }
}
