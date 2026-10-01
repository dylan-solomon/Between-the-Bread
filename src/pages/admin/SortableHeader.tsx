import type { SortState } from '@/utils/tableSort'

type Props<K extends string> = {
  label: string
  sortKey: K
  sort: SortState<K>
  onSort: (key: K) => void
  centered?: boolean
}

export default function SortableHeader<K extends string>({ label, sortKey, sort, onSort, centered = false }: Props<K>) {
  const active = sort.key === sortKey
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <th aria-sort={ariaSort} className={`p-2 ${centered ? 'text-center' : ''}`}>
      <button
        type="button"
        aria-label={`Sort by ${label}`}
        onClick={() => { onSort(sortKey) }}
        className="inline-flex items-center gap-1 uppercase hover:text-neutral-900"
      >
        {label}
        <span aria-hidden="true" className="w-3 text-[10px]">{active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}
