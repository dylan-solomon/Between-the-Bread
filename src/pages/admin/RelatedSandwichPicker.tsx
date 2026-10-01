import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchSandwich, fetchSandwiches } from '@/api/database'

const MAX_RELATED = 10
const RESULT_LIMIT = 8
const SEARCH_DELAY_MS = 250

type Choice = { name: string; slug: string }

type Props = {
  selected: string[]
  onChange: (slugs: string[]) => void
}

export default function RelatedSandwichPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Choice[] | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const lookedUp = useRef(new Set<string>())

  useEffect(() => {
    const term = query.trim()
    if (term === '') {
      setResults(null)
      return
    }
    const timer = setTimeout(() => {
      fetchSandwiches({ q: term, limit: RESULT_LIMIT })
        .then((page) => {
          setResults(page.items)
          setNames((prev) => ({ ...prev, ...Object.fromEntries(page.items.map((item) => [item.slug, item.name])) }))
        })
        .catch(() => { toast.error('Failed to search sandwiches.') })
    }, SEARCH_DELAY_MS)
    return () => { clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    selected
      .filter((slug) => !lookedUp.current.has(slug))
      .forEach((slug) => {
        lookedUp.current.add(slug)
        fetchSandwich(slug)
          .then((entry) => {
            if (entry !== null) setNames((prev) => ({ ...prev, [slug]: entry.name }))
          })
          .catch(() => undefined)
      })
  }, [selected])

  const available = (results ?? []).filter((result) => !selected.includes(result.slug))
  const full = selected.length >= MAX_RELATED

  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-700">Related sandwiches</legend>

      {selected.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2">
          {selected.map((slug) => {
            const label = names[slug] ?? slug
            return (
              <li key={slug} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800">
                <span>{label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  onClick={() => { onChange(selected.filter((existing) => existing !== slug)) }}
                  className="text-neutral-500 hover:text-neutral-900"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {full ? (
        <p className="mt-2 text-xs text-neutral-500">{`You can link up to ${String(MAX_RELATED)} sandwiches.`}</p>
      ) : (
        <div className="mt-2">
          <input
            type="search"
            aria-label="Search sandwiches"
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder="Search the encyclopedia by name"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          {results !== null && available.length === 0 && (
            <p className="mt-1 text-xs text-neutral-500">No matching sandwiches.</p>
          )}
          {available.length > 0 && (
            <ul className="mt-1 space-y-1">
              {available.map((result) => (
                <li key={result.slug}>
                  <button
                    type="button"
                    aria-label={`Add ${result.name}`}
                    onClick={() => { onChange([...selected, result.slug]) }}
                    className="text-sm text-primary underline"
                  >
                    {result.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </fieldset>
  )
}
