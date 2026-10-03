import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { captureSearchPerformed, captureSearchResultClicked } from '@/analytics/events'
import { setHasUsedSearch } from '@/analytics/userProperties'
import { searchSite } from '@/api/search'
import type { SearchResult } from '@/api/search'
import { resultLink, searchPageLink, SOURCE_LABELS } from '@/components/search/resultLinks'
import { useAuth } from '@/context/AuthContext'

const DEBOUNCE_MS = 300
const MIN_LENGTH = 2
const INSTANT_LIMIT = 5

type Answer = { query: string; items: SearchResult[] } | { query: string; failed: true }

type Props = { onClose: () => void }

export default function SearchOverlay({ onClose }: Props) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const token = session?.access_token
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)

  const query = text.trim()
  const searchable = query.length >= MIN_LENGTH

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape) }
  }, [onClose])

  useEffect(() => {
    if (!searchable) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchSite({ q: query, limit: INSTANT_LIMIT, token })
        .then((page) => {
          if (cancelled) return
          setAnswer({ query, items: page.items })
          captureSearchPerformed({ query, source: 'all', resultsCount: page.totalCount, surface: 'header' })
          setHasUsedSearch()
        })
        .catch(() => { if (!cancelled) setAnswer({ query, failed: true }) })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, searchable, token])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!searchable) return
    onClose()
    void navigate(searchPageLink(query))
  }

  const current = answer !== null && answer.query === query ? answer : null

  return (
    <div className="fixed inset-0 z-50">
      <div data-testid="search-backdrop" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative mx-auto mt-16 w-full max-w-xl px-4">
        <div className="overflow-hidden rounded-xl bg-white shadow-xl">
          <form role="search" onSubmit={handleSubmit} className="border-b border-neutral-200 p-3">
            <input
              ref={inputRef}
              type="search"
              aria-label="Search the site"
              value={text}
              onChange={(e) => { setText(e.target.value) }}
              placeholder="Search sandwiches, ingredients and the blog"
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          <div className="p-3 text-sm">
            {!searchable && <p className="text-neutral-500">Type at least 2 letters to search.</p>}

            {searchable && current === null && <p role="status" className="text-neutral-400">Searching…</p>}

            {current !== null && 'failed' in current && (
              <p className="text-neutral-600">Search isn&apos;t working right now. Please try again.</p>
            )}

            {current !== null && 'items' in current && current.items.length === 0 && (
              <p className="text-neutral-600">{`No results for "${query}".`}</p>
            )}

            {current !== null && 'items' in current && current.items.length > 0 && (
              <ul className="space-y-1">
                {current.items.map((result, index) => (
                  <li key={`${result.source}-${result.slug}`}>
                    <Link
                      to={resultLink(result)}
                      onClick={() => {
                        captureSearchResultClicked({
                          query,
                          resultSource: result.source,
                          slug: result.slug,
                          position: index + 1,
                          surface: 'header',
                        })
                        onClose()
                      }}
                      className="flex items-center justify-between gap-3 rounded px-2 py-1.5 hover:bg-neutral-50"
                    >
                      <span className="font-medium text-neutral-900">{result.title}</span>{' '}
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        {SOURCE_LABELS[result.source]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {searchable && (
              <Link
                to={searchPageLink(query)}
                onClick={onClose}
                className="mt-3 block border-t border-neutral-100 pt-3 text-center font-medium text-primary hover:underline"
              >
                {`See all results for "${query}"`}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
