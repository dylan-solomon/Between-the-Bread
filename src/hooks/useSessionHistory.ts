import { useState, useCallback } from 'react'
import type { HistoryEntry, SandwichComposition } from '@/types'

const MAX_ENTRIES = 20
export const SESSION_HISTORY_KEY = 'btb_session_history'

type StoredEntry = Omit<HistoryEntry, 'timestamp'> & { timestamp: string }

const persist = (entries: readonly HistoryEntry[]): void => {
  try {
    sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

const restore = (): readonly HistoryEntry[] => {
  try {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw) as StoredEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
  } catch {
    return []
  }
}

export type SessionHistory = {
  entries: readonly HistoryEntry[]
  addEntry: (composition: SandwichComposition, name: string) => void
}

export const useSessionHistory = (): SessionHistory => {
  const [entries, setEntries] = useState<readonly HistoryEntry[]>(restore)

  const addEntry = useCallback((composition: SandwichComposition, name: string) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      composition,
      name,
      timestamp: new Date(),
    }
    setEntries((prev) => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES)
      persist(next)
      return next
    })
  }, [])

  return { entries, addEntry }
}
