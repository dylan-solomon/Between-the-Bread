import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSandwichSession } from '@/hooks/useSandwichSession'
import { makeComposition } from '@/test/factories'

describe('useSandwichSession', () => {
  describe('initial state', () => {
    it('has no composition', () => {
      const { result } = renderHook(() => useSandwichSession())
      expect(result.current.composition).toBeNull()
    })

    it('has not rolled', () => {
      const { result } = renderHook(() => useSandwichSession())
      expect(result.current.hasRolled).toBe(false)
    })

    it('has no locked categories', () => {
      const { result } = renderHook(() => useSandwichSession())
      expect(result.current.lockedCategories.size).toBe(0)
    })

    it('has no doubled categories', () => {
      const { result } = renderHook(() => useSandwichSession())
      expect(result.current.doubleCategories.size).toBe(0)
    })
  })

  describe('setComposition', () => {
    it('updates the composition', () => {
      const { result } = renderHook(() => useSandwichSession())
      const composition = makeComposition()
      act(() => { result.current.setComposition(composition) })
      expect(result.current.composition).toEqual(composition)
    })

    it('marks hasRolled as true', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      expect(result.current.hasRolled).toBe(true)
    })
  })

  describe('lock/unlock', () => {
    it('canLock returns false before any composition is set', () => {
      const { result } = renderHook(() => useSandwichSession())
      expect(result.current.canLock('bread')).toBe(false)
    })

    it('canLock returns true after composition is set', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      expect(result.current.canLock('bread')).toBe(true)
    })

    it('toggleLock locks an unlocked category', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      act(() => { result.current.toggleLock('bread') })
      expect(result.current.isLocked('bread')).toBe(true)
    })

    it('toggleLock unlocks a locked category', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      act(() => { result.current.toggleLock('bread') })
      act(() => { result.current.toggleLock('bread') })
      expect(result.current.isLocked('bread')).toBe(false)
    })

    it('toggleLock has no effect when canLock is false', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.toggleLock('bread') })
      expect(result.current.isLocked('bread')).toBe(false)
    })

    it('locking one category does not lock others', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      act(() => { result.current.toggleLock('bread') })
      expect(result.current.isLocked('protein')).toBe(false)
    })
  })

  describe('loadComposition', () => {
    it('sets the composition to the provided value', () => {
      const { result } = renderHook(() => useSandwichSession())
      const composition = makeComposition()
      act(() => { result.current.loadComposition(composition) })
      expect(result.current.composition).toEqual(composition)
    })

    it('clears all locked categories', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.setComposition(makeComposition()) })
      act(() => { result.current.toggleLock('bread') })
      act(() => { result.current.toggleLock('protein') })
      expect(result.current.lockedCategories.size).toBe(2)

      act(() => { result.current.loadComposition(makeComposition()) })
      expect(result.current.lockedCategories.size).toBe(0)
    })
  })

  describe('double mode', () => {
    it('toggleDouble enables double mode for a category', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.toggleDouble('protein') })
      expect(result.current.isDouble('protein')).toBe(true)
    })

    it('toggleDouble disables double mode when already enabled', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.toggleDouble('protein') })
      act(() => { result.current.toggleDouble('protein') })
      expect(result.current.isDouble('protein')).toBe(false)
    })

    it('toggling double for one category does not affect the other', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.toggleDouble('protein') })
      expect(result.current.isDouble('cheese')).toBe(false)
    })

    it('double mode is available before any roll', () => {
      const { result } = renderHook(() => useSandwichSession())
      act(() => { result.current.toggleDouble('cheese') })
      expect(result.current.isDouble('cheese')).toBe(true)
    })
  })
})
