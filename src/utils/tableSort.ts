export type SortDirection = 'asc' | 'desc'

export type SortState<K extends string> = { key: K; direction: SortDirection }

type SortValue = string | number | boolean | null

export const nextSort = <K extends string>(current: SortState<K>, key: K): SortState<K> =>
  current.key === key
    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' }

const compareValues = (a: Exclude<SortValue, null>, b: Exclude<SortValue, null>): number => {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
}

export const sortRows = <T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  accessors: Record<K, (row: T) => SortValue>,
): T[] => {
  const read = accessors[sort.key]
  const direction = sort.direction === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: read(row) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index
      if (a.value === null) return 1
      if (b.value === null) return -1
      return compareValues(a.value, b.value) * direction || a.index - b.index
    })
    .map(({ row }) => row)
}
