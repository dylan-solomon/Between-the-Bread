import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCyclingText } from '@/hooks/useCyclingText'
import { makeIngredient, makePool } from '@/test/factories'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useCyclingText', () => {
  describe('not rolling', () => {
    it('returns a placeholder when selection is empty', () => {
      const { result } = renderHook(() =>
        useCyclingText({ isRolling: false, selection: [], pool: makePool(5) }),
      )
      expect(result.current).toBe('—')
    })

    it('returns the ingredient name for a single selection', () => {
      const { result } = renderHook(() =>
        useCyclingText({
          isRolling: false,
          selection: [makeIngredient({ name: 'Sourdough' })],
          pool: makePool(5),
        }),
      )
      expect(result.current).toBe('Sourdough')
    })

    it('joins multiple selections with " & "', () => {
      const { result } = renderHook(() =>
        useCyclingText({
          isRolling: false,
          selection: [makeIngredient({ name: 'Cheddar' }), makeIngredient({ name: 'Swiss' })],
          pool: makePool(5),
        }),
      )
      expect(result.current).toBe('Cheddar & Swiss')
    })
  })

  describe('rolling', () => {
    it('shows a name from the pool while rolling', () => {
      const pool = makePool(5, 'opt')
      const { result } = renderHook(() =>
        useCyclingText({ isRolling: true, selection: [], pool }),
      )
      act(() => { vi.advanceTimersByTime(80) })
      const poolNames = pool.map((i) => i.name)
      expect(poolNames).toContain(result.current)
    })

    it('cycles the text on each 80ms interval', () => {
      const pool = [makeIngredient({ name: 'Only Option' })]
      const { result } = renderHook(() =>
        useCyclingText({ isRolling: true, selection: [], pool }),
      )
      act(() => { vi.advanceTimersByTime(400) }) // 5 intervals
      expect(result.current).toBe('Only Option')
    })

    it('shows a placeholder when pool is empty while rolling', () => {
      const { result } = renderHook(() =>
        useCyclingText({ isRolling: true, selection: [], pool: [] }),
      )
      act(() => { vi.advanceTimersByTime(80) })
      expect(result.current).toBe('—')
    })
  })

  describe('transitioning', () => {
    it('returns to selection text when rolling stops', () => {
      const selection = [makeIngredient({ name: 'Sourdough' })]
      const pool = makePool(5)
      const { result, rerender } = renderHook(
        ({ isRolling }: { isRolling: boolean }) =>
          useCyclingText({ isRolling, selection, pool }),
        { initialProps: { isRolling: true } },
      )
      act(() => { rerender({ isRolling: false }) })
      expect(result.current).toBe('Sourdough')
    })

    it('returns placeholder when rolling stops with no selection', () => {
      const pool = makePool(5)
      const { result, rerender } = renderHook(
        ({ isRolling }: { isRolling: boolean }) =>
          useCyclingText({ isRolling, selection: [], pool }),
        { initialProps: { isRolling: true } },
      )
      act(() => { rerender({ isRolling: false }) })
      expect(result.current).toBe('—')
    })
  })
})
