import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Heart, Trash2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import StarRating from '@/components/StarRating'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/context/AuthContext'
import { SESSION_HISTORY_KEY } from '@/hooks/useSessionHistory'
import {
  fetchSavedSandwiches,
  updateSavedSandwich,
  deleteSavedSandwich,
  clearSavedSandwiches,
} from '@/api/savedSandwiches'
import type { SavedSandwich } from '@/api/savedSandwiches'
import type { HistoryEntry, Ingredient, SandwichComposition } from '@/types'
import {
  captureHistoryViewed,
  captureHistorySearched,
  captureHistorySandwichFavorited,
  captureHistorySandwichUnfavorited,
  captureHistorySandwichDeleted,
  captureHistoryCleared,
  captureHistorySandwichRated,
} from '@/analytics/events'

const PAGE_SIZE = 10
const DEBOUNCE_MS = 300
const LOAD_SANDWICH_KEY = 'btb_load_sandwich'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const extractName = (item: unknown): string => {
  if (typeof item === 'string') return UUID_RE.test(item) ? '' : item
  if (typeof item === 'object' && item !== null && 'name' in item) return String((item as { name: unknown }).name)
  return ''
}

const extractSlug = (item: unknown): string => {
  if (typeof item === 'string') return item
  if (typeof item === 'object' && item !== null && 'slug' in item) return String((item as { slug: unknown }).slug)
  return ''
}

const NO_CHEESE_SLUG = 'no-cheese'

const buildDescription = (composition: Partial<Record<string, unknown[]>>): string => {
  const chefsSpecial = composition['chefs-special'] ?? []
  const cheese = (composition.cheese ?? []).filter((i) => extractSlug(i) !== NO_CHEESE_SLUG)

  return [
    ...(composition.protein ?? []),
    ...cheese,
    ...(composition.toppings ?? []),
    ...(composition.condiments ?? []),
    ...chefsSpecial,
    ...(composition.bread ?? []),
  ]
    .map(extractName)
    .filter((n) => n !== '')
    .join(', ')
}

const buildSessionDescription = (composition: Partial<Record<string, Ingredient[]>>): string => {
  const chefsSpecial = composition['chefs-special'] ?? []
  const cheese = (composition.cheese ?? []).filter((i) => i.slug !== NO_CHEESE_SLUG)

  return [
    ...(composition.protein ?? []),
    ...cheese,
    ...(composition.toppings ?? []),
    ...(composition.condiments ?? []),
    ...chefsSpecial,
    ...(composition.bread ?? []),
  ]
    .map((i) => i.name)
    .join(', ')
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

type SortOption = 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'name_asc' | 'name_desc'
type Tab = 'saved' | 'session'

const SORT_OPTIONS: readonly { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating_high', label: 'Highest rated' },
  { value: 'rating_low', label: 'Lowest rated' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
]

type StoredSessionEntry = Omit<HistoryEntry, 'timestamp' | 'composition'> & {
  timestamp: string
  composition: Record<string, Ingredient[]>
}

const readSessionEntries = (): HistoryEntry[] => {
  try {
    const raw = sessionStorage.getItem(SESSION_HISTORY_KEY)
    if (raw === null) return []
    const parsed = JSON.parse(raw) as StoredSessionEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((e) => ({
      ...e,
      composition: e.composition as unknown as SandwichComposition,
      timestamp: new Date(e.timestamp),
    }))
  } catch {
    return []
  }
}

export default function HistoryPage() {
  const { loading: authLoading, authenticated } = useRequireAuth()
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('saved')
  const [sandwiches, setSandwiches] = useState<SavedSandwich[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [confirmClear, setConfirmClear] = useState(false)
  const [sessionEntries, setSessionEntries] = useState<HistoryEntry[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewedRef = useRef(false)

  const fetchData = useCallback(async (params: {
    q?: string
    sort?: string
    favorites_only?: boolean
    rating?: number
    offset?: number
  } = {}) => {
    if (session === null) return
    setLoading(true)
    try {
      const result = await fetchSavedSandwiches(session.access_token, {
        q: params.q !== undefined && params.q !== '' ? params.q : undefined,
        sort: params.sort,
        favorites_only: params.favorites_only,
        rating: params.rating,
        limit: PAGE_SIZE,
        offset: params.offset ?? 0,
      })
      setSandwiches(result.data)
      setTotal(result.meta.total)

      if (params.q !== undefined && params.q !== '') {
        captureHistorySearched({
          query: params.q,
          resultsCount: result.meta.total,
          filtersApplied: [
            ...(params.favorites_only === true ? ['favorites'] : []),
            ...(params.rating !== undefined ? [`rating:${String(params.rating)}`] : []),
          ],
        })
      }
    } catch {
      toast.error('Failed to load history.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (!authenticated || session === null) return
    if (!viewedRef.current) {
      viewedRef.current = true
      captureHistoryViewed()
    }
    void fetchData({ sort })
  }, [authenticated, session, fetchData, sort])

  useEffect(() => {
    setSessionEntries(readSessionEntries())
  }, [])

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setOffset(0)
    if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchData({ q: value, sort, favorites_only: favoritesOnly || undefined, rating: ratingFilter, offset: 0 })
    }, DEBOUNCE_MS)
  }

  const handleSortChange = (value: SortOption) => {
    setSort(value)
    setOffset(0)
    void fetchData({ q: query, sort: value, favorites_only: favoritesOnly || undefined, rating: ratingFilter, offset: 0 })
  }

  const handleFavoritesToggle = () => {
    const next = !favoritesOnly
    setFavoritesOnly(next)
    setOffset(0)
    void fetchData({ q: query, sort, favorites_only: next || undefined, rating: ratingFilter, offset: 0 })
  }

  const handleRatingFilterChange = (value: string) => {
    const rating = value === '' ? undefined : Number(value)
    setRatingFilter(rating)
    setOffset(0)
    void fetchData({ q: query, sort, favorites_only: favoritesOnly || undefined, rating, offset: 0 })
  }

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset)
    void fetchData({ q: query, sort, favorites_only: favoritesOnly || undefined, rating: ratingFilter, offset: newOffset })
  }

  const handleToggleFavorite = async (sandwich: SavedSandwich) => {
    if (session === null) return
    const nextFav = !sandwich.is_favorite
    try {
      await updateSavedSandwich(session.access_token, sandwich.id, { is_favorite: nextFav })
      setSandwiches((prev) =>
        prev.map((s) => (s.id === sandwich.id ? { ...s, is_favorite: nextFav } : s)),
      )
      if (nextFav) {
        const totalFavorites = sandwiches.filter((s) => s.is_favorite).length + 1
        captureHistorySandwichFavorited({ sandwichName: sandwich.name, totalFavorites })
      } else {
        captureHistorySandwichUnfavorited({ sandwichName: sandwich.name })
      }
    } catch {
      toast.error('Failed to update favorite.')
    }
  }

  const handleDelete = async (sandwich: SavedSandwich) => {
    if (session === null) return
    try {
      await deleteSavedSandwich(session.access_token, sandwich.id)
      captureHistorySandwichDeleted()
      setSandwiches((prev) => prev.filter((s) => s.id !== sandwich.id))
      setTotal((prev) => prev - 1)
      toast.success('Sandwich deleted.')
    } catch {
      toast.error('Failed to delete sandwich.')
    }
  }

  const handleRate = async (sandwich: SavedSandwich, rating: number) => {
    if (session === null) return
    try {
      await updateSavedSandwich(session.access_token, sandwich.id, { rating })
      setSandwiches((prev) =>
        prev.map((s) => (s.id === sandwich.id ? { ...s, rating } : s)),
      )
      captureHistorySandwichRated({
        rating,
        previousRating: sandwich.rating,
        sandwichName: sandwich.name,
      })
    } catch {
      toast.error('Failed to save rating.')
    }
  }

  const handleClearAll = async () => {
    if (session === null) return
    try {
      const deletedCount = await clearSavedSandwiches(session.access_token, false)
      captureHistoryCleared({ deletedCount, includedFavorites: false })
      setConfirmClear(false)
      void fetchData({ q: query, sort, favorites_only: favoritesOnly || undefined, rating: ratingFilter, offset: 0 })
      toast.success(`Cleared ${String(deletedCount)} sandwich${deletedCount === 1 ? '' : 'es'}.`)
    } catch {
      toast.error('Failed to clear history.')
    }
  }

  if (authLoading || !authenticated) return null

  const hasMore = offset + PAGE_SIZE < total
  const hasPrev = offset > 0

  const tabClass = (tab: Tab): string =>
    `px-4 py-2 text-sm font-medium transition ${
      activeTab === tab
        ? 'border-b-2 border-primary text-primary'
        : 'text-neutral-500 hover:text-neutral-700'
    }`

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-neutral-900">My Sandwiches</h1>

        <div role="tablist" aria-label="Sandwich views" className="mt-6 flex border-b border-neutral-200">
          <button
            role="tab"
            aria-selected={activeTab === 'session'}
            onClick={() => { setActiveTab('session') }}
            className={tabClass('session')}
          >
            Session
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'saved'}
            onClick={() => { setActiveTab('saved') }}
            className={tabClass('saved')}
          >
            Saved
          </button>
        </div>

        {activeTab === 'session' && (
          <div role="tabpanel" aria-label="Session history">
            {sessionEntries.length === 0 && (
              <p className="mt-8 text-center text-sm text-neutral-500">
                No sandwiches rolled this session yet. Roll a sandwich on the home page!
              </p>
            )}

            {sessionEntries.length > 0 && (
              <ul className="mt-4 divide-y divide-neutral-200">
                {sessionEntries.map((entry) => (
                  <li key={entry.id} className="py-3">
                    <Link
                      to="/"
                      onClick={() => {
                        const serialized = Object.fromEntries(
                          Object.entries(entry.composition).map(([cat, ingredients]) => [
                            cat,
                            ingredients.map((i) => ({ slug: i.slug, name: i.name })),
                          ]),
                        )
                        sessionStorage.setItem(LOAD_SANDWICH_KEY, JSON.stringify({ composition: serialized }))
                      }}
                      className="font-display text-sm font-semibold text-neutral-900 truncate block hover:text-primary transition"
                    >
                      {entry.name}
                    </Link>
                    <p
                      data-testid="session-sandwich-description"
                      className="mt-0.5 text-xs italic text-neutral-400"
                    >
                      {buildSessionDescription(entry.composition as Record<string, Ingredient[]>)}
                    </p>
                    <p className="text-xs text-neutral-400">{formatTime(entry.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div role="tabpanel" aria-label="Saved sandwiches">
            {total >= 50 && (
              <div role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                History full. Remove a sandwich or unfavorite one to make room.
              </div>
            )}

            {total >= 45 && total < 50 && (
              <div role="status" className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
                You&apos;re approaching your 50-sandwich limit.
              </div>
            )}

            <div className="mt-4 space-y-3">
              <input
                type="search"
                role="searchbox"
                placeholder="Search sandwiches..."
                aria-label="Search sandwiches"
                value={query}
                onChange={(e) => { handleSearchChange(e.target.value) }}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={handleFavoritesToggle}
                    className="rounded border-neutral-300 text-primary focus:ring-primary"
                  />
                  Favorites only
                </label>

                <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <span className="sr-only">Filter by rating</span>
                  <select
                    aria-label="Filter by rating"
                    value={ratingFilter ?? ''}
                    onChange={(e) => { handleRatingFilterChange(e.target.value) }}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
                  >
                    <option value="">All ratings</option>
                    <option value="1">1 star</option>
                    <option value="2">2 stars</option>
                    <option value="3">3 stars</option>
                    <option value="4">4 stars</option>
                    <option value="5">5 stars</option>
                  </select>
                </label>

                <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <span className="sr-only">Sort by</span>
                  <select
                    aria-label="Sort by"
                    value={sort}
                    onChange={(e) => { handleSortChange(e.target.value as SortOption) }}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {loading && (
              <p className="mt-8 text-sm text-neutral-500">Loading...</p>
            )}

            {!loading && sandwiches.length === 0 && (
              <p className="mt-8 text-center text-sm text-neutral-500">
                {query !== '' ? `No results for "${query}".` : 'No saved sandwiches yet. Roll a sandwich and save it!'}
              </p>
            )}

            {!loading && query !== '' && sandwiches.length > 0 && (
              <p className="mt-4 text-xs text-neutral-400">
                {total} {total === 1 ? 'result' : 'results'}
              </p>
            )}

            {!loading && sandwiches.length > 0 && (
              <ul className="mt-4 divide-y divide-neutral-200">
                {sandwiches.map((sandwich) => (
                  <li key={sandwich.id} className="flex items-start gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/"
                        onClick={() => {
                          sessionStorage.setItem(LOAD_SANDWICH_KEY, JSON.stringify({ composition: sandwich.composition, savedId: sandwich.id, rating: sandwich.rating }))
                        }}
                        className="font-display text-sm font-semibold text-neutral-900 truncate block hover:text-primary transition"
                      >
                        {sandwich.name}
                      </Link>
                      <p
                        data-testid="sandwich-description"
                        className="mt-0.5 text-xs italic text-neutral-400"
                      >
                        {buildDescription(sandwich.composition)}
                      </p>
                      <p className="text-xs text-neutral-400">{formatDate(sandwich.created_at)}</p>
                      <div className="mt-1">
                        <StarRating
                          value={sandwich.rating}
                          onChange={(rating) => { void handleRate(sandwich, rating) }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        aria-label={sandwich.is_favorite ? 'Unfavorite' : 'Favorite'}
                        onClick={() => { void handleToggleFavorite(sandwich) }}
                        className="rounded p-1 text-neutral-400 transition hover:text-red-500"
                      >
                        <Heart
                          size={16}
                          className={sandwich.is_favorite ? 'fill-red-500 text-red-500' : ''}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => { void handleDelete(sandwich) }}
                        className="rounded p-1 text-neutral-400 transition hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loading && (hasMore || hasPrev) && (
              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={!hasPrev}
                  onClick={() => { handlePageChange(offset - PAGE_SIZE) }}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={!hasMore}
                  onClick={() => { handlePageChange(offset + PAGE_SIZE) }}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            {!loading && sandwiches.length > 0 && (
              <div className="mt-6 text-center">
                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={() => { setConfirmClear(true) }}
                    className="text-xs text-neutral-400 underline transition hover:text-red-500"
                  >
                    Clear all
                  </button>
                ) : (
                  <div className="space-x-2">
                    <span className="text-xs text-neutral-500">Clear all non-favorite sandwiches?</span>
                    <button
                      type="button"
                      onClick={() => { void handleClearAll() }}
                      className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmClear(false) }}
                      className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
