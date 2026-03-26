import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionHistory, SESSION_HISTORY_KEY } from '@/hooks/useSessionHistory'
import { makeComposition } from '@/test/factories'

beforeEach(() => {
  sessionStorage.removeItem(SESSION_HISTORY_KEY)
})

describe('useSessionHistory', () => {
  it('starts with empty entries when sessionStorage is empty', () => {
    const { result } = renderHook(() => useSessionHistory())
    expect(result.current.entries).toHaveLength(0)
  })

  it('addEntry adds an entry with the correct composition and name', () => {
    const { result } = renderHook(() => useSessionHistory())
    const composition = makeComposition()
    act(() => { result.current.addEntry(composition, 'The Classic Club') })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0]?.composition).toEqual(composition)
    expect(result.current.entries[0]?.name).toBe('The Classic Club')
  })

  it('addEntry assigns a unique id to each entry', () => {
    const { result } = renderHook(() => useSessionHistory())
    act(() => { result.current.addEntry(makeComposition(), 'Sandwich A') })
    act(() => { result.current.addEntry(makeComposition(), 'Sandwich B') })
    expect(result.current.entries[0]?.id).toBeDefined()
    expect(result.current.entries[1]?.id).toBeDefined()
    expect(result.current.entries[0]?.id).not.toBe(result.current.entries[1]?.id)
  })

  it('addEntry assigns a timestamp close to the current time', () => {
    const before = new Date()
    const { result } = renderHook(() => useSessionHistory())
    act(() => { result.current.addEntry(makeComposition(), 'Timestamped') })
    const after = new Date()
    expect(result.current.entries[0]?.timestamp).toBeInstanceOf(Date)
    const ms = result.current.entries[0]?.timestamp.getTime() ?? -1
    expect(ms).toBeGreaterThanOrEqual(before.getTime())
    expect(ms).toBeLessThanOrEqual(after.getTime())
  })

  it('newest entry appears first in the list', () => {
    const { result } = renderHook(() => useSessionHistory())
    act(() => { result.current.addEntry(makeComposition(), 'First') })
    act(() => { result.current.addEntry(makeComposition(), 'Second') })
    expect(result.current.entries[0]?.name).toBe('Second')
    expect(result.current.entries[1]?.name).toBe('First')
  })

  it('caps at 20 entries, removing the oldest when a 21st is added', () => {
    const { result } = renderHook(() => useSessionHistory())
    for (let i = 0; i < 20; i++) {
      act(() => { result.current.addEntry(makeComposition(), `Sandwich ${String(i)}`) })
    }
    expect(result.current.entries).toHaveLength(20)
    expect(result.current.entries.at(-1)?.name).toBe('Sandwich 0')

    act(() => { result.current.addEntry(makeComposition(), 'Sandwich 20') })
    expect(result.current.entries).toHaveLength(20)
    expect(result.current.entries[0]?.name).toBe('Sandwich 20')
    expect(result.current.entries.at(-1)?.name).toBe('Sandwich 1')
  })

  describe('sessionStorage persistence', () => {
    it('persists entries to sessionStorage when an entry is added', () => {
      const { result } = renderHook(() => useSessionHistory())
      act(() => { result.current.addEntry(makeComposition(), 'Persisted Sandwich') })
      const stored = sessionStorage.getItem(SESSION_HISTORY_KEY)
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored ?? '[]') as unknown[]
      expect(parsed).toHaveLength(1)
    })

    it('restores entries from sessionStorage on init', () => {
      const { result: first } = renderHook(() => useSessionHistory())
      act(() => { first.current.addEntry(makeComposition(), 'Restored Sandwich') })

      const { result: second } = renderHook(() => useSessionHistory())
      expect(second.current.entries).toHaveLength(1)
      expect(second.current.entries[0]?.name).toBe('Restored Sandwich')
    })

    it('restores timestamps as Date objects', () => {
      const { result: first } = renderHook(() => useSessionHistory())
      act(() => { first.current.addEntry(makeComposition(), 'Dated Sandwich') })

      const { result: second } = renderHook(() => useSessionHistory())
      expect(second.current.entries[0]?.timestamp).toBeInstanceOf(Date)
    })

    it('handles corrupt sessionStorage gracefully', () => {
      sessionStorage.setItem(SESSION_HISTORY_KEY, 'not-json')
      const { result } = renderHook(() => useSessionHistory())
      expect(result.current.entries).toHaveLength(0)
    })
  })
})
