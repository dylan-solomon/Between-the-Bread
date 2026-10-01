import { describe, it, expect } from 'vitest'
import { nextSort, sortRows } from '@/utils/tableSort'
import type { SortState } from '@/utils/tableSort'

type Row = { name: string; rating: number | null; live: boolean }
type Key = 'name' | 'rating' | 'live'

const accessors = {
  name: (row: Row) => row.name,
  rating: (row: Row) => row.rating,
  live: (row: Row) => row.live,
}

const rows: Row[] = [
  { name: 'banana', rating: 3, live: true },
  { name: 'Apple', rating: null, live: false },
  { name: 'cherry', rating: 5, live: false },
  { name: 'Date', rating: 3, live: true },
]

const names = (sorted: Row[]): string[] => sorted.map((row) => row.name)
const sort = (key: Key, direction: 'asc' | 'desc', input = rows) => sortRows(input, { key, direction }, accessors)

describe('sortRows', () => {
  it('sorts text without regard to case', () => {
    expect(names(sort('name', 'asc'))).toEqual(['Apple', 'banana', 'cherry', 'Date'])
    expect(names(sort('name', 'desc'))).toEqual(['Date', 'cherry', 'banana', 'Apple'])
  })

  it('sorts numbers in numeric order inside text', () => {
    const items = ['Item 10', 'Item 2', 'Item 1'].map((name) => ({ name, rating: 1, live: true }))

    expect(names(sort('name', 'asc', items))).toEqual(['Item 1', 'Item 2', 'Item 10'])
  })

  it('sorts numbers', () => {
    expect(names(sort('rating', 'asc')).slice(0, 3)).toEqual(['banana', 'Date', 'cherry'])
    expect(names(sort('rating', 'desc')).slice(0, 3)).toEqual(['cherry', 'banana', 'Date'])
  })

  it('puts missing values last in both directions', () => {
    expect(names(sort('rating', 'asc')).at(-1)).toBe('Apple')
    expect(names(sort('rating', 'desc')).at(-1)).toBe('Apple')
  })

  it('sorts false before true when ascending', () => {
    expect(sort('live', 'asc').map((row) => row.live)).toEqual([false, false, true, true])
    expect(sort('live', 'desc').map((row) => row.live)).toEqual([true, true, false, false])
  })

  it('keeps rows with equal values in their original order', () => {
    expect(names(sort('rating', 'asc')).slice(0, 2)).toEqual(['banana', 'Date'])
    expect(names(sort('rating', 'desc')).slice(1, 3)).toEqual(['banana', 'Date'])
  })

  it('does not change the list it is given', () => {
    const before = names(rows)

    sort('name', 'desc')

    expect(names(rows)).toEqual(before)
  })
})

describe('nextSort', () => {
  const current: SortState<Key> = { key: 'name', direction: 'asc' }

  it('reverses the direction when the same column is chosen again', () => {
    expect(nextSort(current, 'name')).toEqual({ key: 'name', direction: 'desc' })
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' })
  })

  it('starts a different column in ascending order', () => {
    expect(nextSort({ key: 'name', direction: 'desc' }, 'rating')).toEqual({ key: 'rating', direction: 'asc' })
  })
})
