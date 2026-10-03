import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { captureSearchPerformed, captureSearchResultClicked } from '@/analytics/events'
import { searchSite } from '@/api/search'
import type { SearchCounts, SearchResult, SearchTab } from '@/api/search'
import SandwichVisual from '@/components/SandwichVisual'
import { resultLink, SOURCE_LABELS } from '@/components/search/resultLinks'
import { useAuth } from '@/context/AuthContext'
import { DIETARY_TAGS } from '@/data/dietaryTags'
import { madeLabel } from '@/seo/communitySandwich'
import { formatPostDate } from '@/utils/blogPost'
import { toVisualComposition } from '@/utils/sandwichLayers'

const PAGE_SIZE = 20

const TABS: { value: SearchTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'database', label: 'Classic Sandwiches' },
  { value: 'community', label: 'Community' },
  { value: 'blog', label: 'Blog' },
  { value: 'saved', label: 'My History' },
]

type Status = 'idle' | 'loading' | 'ready' | 'error'

const isTab = (value: string | null): value is SearchTab => TABS.some((tab) => tab.value === value)

const readSearch = (params: URLSearchParams) => {
  const source = params.get('source')
  return {
    q: (params.get('q') ?? '').trim(),
    source: isTab(source) ? source : ('all' as SearchTab),
    diet: (params.get('diet') ?? '').split(',').filter((tag) => tag !== ''),
  }
}

const ratingText = (avgRating: number | null, ratingCount: number): string =>
  avgRating === null ? 'Not yet rated' : `★ ${String(avgRating)} (${String(ratingCount)})`

const tabCount = (counts: SearchCounts, tab: SearchTab): number | null => {
  if (tab === 'all') return counts.database + counts.community + counts.blog + (counts.saved ?? 0)
  return counts[tab]
}

const Emoji = ({ children }: { children: string }) => (
  <div aria-hidden="true" className="flex h-full items-center justify-center text-3xl">{children}</div>
)

const thumbnail = (result: SearchResult): ReactNode => {
  switch (result.source) {
    case 'database':
      return result.details.image_url === null
        ? <Emoji>🥪</Emoji>
        : <img src={result.details.image_url} alt="" className="h-full w-full object-cover" />
    case 'blog':
      return result.details.cover_image_url === null
        ? <Emoji>📝</Emoji>
        : <img src={result.details.cover_image_url} alt="" className="h-full w-full object-cover" />
    case 'community':
    case 'saved':
      return <SandwichVisual size="compact" composition={toVisualComposition(result.details.composition)} />
  }
}

const summary = (result: SearchResult): { subtitle: string | null; meta: string } => {
  switch (result.source) {
    case 'database':
      return {
        subtitle: result.details.description,
        meta: [result.details.origin_country, ratingText(result.details.avg_rating, result.details.rating_count)]
          .filter((part) => part !== null)
          .join(' · '),
      }
    case 'community':
      return {
        subtitle: result.details.fun_name,
        meta: `${madeLabel(result.details.generated_count)} · ${ratingText(result.details.avg_rating, result.details.rating_count)}`,
      }
    case 'blog':
      return {
        subtitle: result.details.excerpt,
        meta: `${formatPostDate(result.details.published_at)} · ${String(result.details.reading_time_minutes)} min read`,
      }
    case 'saved':
      return {
        subtitle: null,
        meta: [
          `Saved ${formatPostDate(result.details.created_at)}`,
          result.details.rating === null ? null : `★ ${String(result.details.rating)}`,
          result.details.is_favorite ? 'Favorite' : null,
        ]
          .filter((part) => part !== null)
          .join(' · '),
      }
  }
}

function ResultRow({ result, onOpen }: { result: SearchResult; onOpen: () => void }) {
  const { subtitle, meta } = summary(result)
  return (
    <li>
      <Link
        to={resultLink(result)}
        onClick={onOpen}
        className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition hover:shadow-md"
      >
        <div className="flex w-24 shrink-0 items-center overflow-hidden rounded bg-neutral-50">{thumbnail(result)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-display text-lg font-bold text-neutral-900">{result.title}</p>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
              {SOURCE_LABELS[result.source]}
            </span>
          </div>
          {subtitle !== null && subtitle !== '' && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{subtitle}</p>}
          <p className="mt-1 text-xs text-neutral-500">{meta}</p>
        </div>
      </Link>
    </li>
  )
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const paramsKey = params.toString()
  const search = readSearch(params)
  const { session, loading: authLoading } = useAuth()
  const token = session?.access_token

  const [draft, setDraft] = useState(search.q)
  const [items, setItems] = useState<SearchResult[]>([])
  const [counts, setCounts] = useState<SearchCounts | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<Status>(search.q === '' ? 'idle' : 'loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { setDraft(search.q) }, [search.q])

  useEffect(() => {
    const query = readSearch(new URLSearchParams(paramsKey))
    if (query.q === '') {
      setStatus('idle')
      return
    }
    if (authLoading) return
    let cancelled = false
    setStatus('loading')
    searchSite({ ...query, limit: PAGE_SIZE, offset: 0, token })
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setCounts(page.counts)
        setTotalCount(page.totalCount)
        setStatus('ready')
        captureSearchPerformed({ query: query.q, source: query.source, resultsCount: page.totalCount, surface: 'page' })
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [paramsKey, authLoading, token, attempt])

  const updateParams = (changes: Partial<Record<'q' | 'source' | 'diet', string>>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '') next.delete(key)
      else next.set(key, value)
    })
    setParams(next)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    updateParams({ q: draft.trim() })
  }

  const toggleDiet = (tag: string) => {
    const diet = search.diet.includes(tag) ? search.diet.filter((existing) => existing !== tag) : [...search.diet, tag]
    updateParams({ diet: diet.join(',') })
  }

  const loadMore = () => {
    setLoadingMore(true)
    searchSite({ ...search, limit: PAGE_SIZE, offset: items.length, token })
      .then((page) => {
        setItems((prev) => [...prev, ...page.items])
        setTotalCount(page.totalCount)
      })
      .catch(() => { toast.error('Failed to load more results.') })
      .finally(() => { setLoadingMore(false) })
  }

  const visibleTabs = TABS.filter((tab) => tab.value !== 'saved' || (counts !== null && counts.saved !== null))

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>{search.q === '' ? 'Search | Between the Bread' : `Search: ${search.q} | Between the Bread`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">
        {search.q === '' ? 'Search' : `Results for "${search.q}"`}
      </h1>

      <form role="search" onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          type="search"
          aria-label="Search"
          value={draft}
          onChange={(e) => { setDraft(e.target.value) }}
          placeholder="Search sandwiches, ingredients and the blog"
          className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {search.q === '' && (
        <p className="mt-6 text-neutral-600">
          Search classic sandwiches, community creations, the blog and, when you&apos;re signed in, your saved sandwiches.
        </p>
      )}

      {search.q !== '' && (
        <>
          {counts !== null && (
            <div role="group" aria-label="Results from" className="mt-6 flex flex-wrap gap-2">
              {visibleTabs.map((tab) => {
                const active = search.source === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { updateParams({ source: tab.value === 'all' ? '' : tab.value }) }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {`${tab.label} (${String(tabCount(counts, tab.value) ?? 0)})`}
                  </button>
                )
              })}
            </div>
          )}

          <fieldset className="mt-4 flex flex-wrap gap-3">
            <legend className="sr-only">Dietary</legend>
            {DIETARY_TAGS.map(({ tag, filterLabel }) => (
              <label key={tag} className="flex items-center gap-1 text-sm text-neutral-700">
                <input type="checkbox" checked={search.diet.includes(tag)} onChange={() => { toggleDiet(tag) }} />
                {filterLabel}
              </label>
            ))}
          </fieldset>
          {search.diet.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500">
              Dietary filters apply to sandwiches, so blog posts and your history are hidden while one is on.
            </p>
          )}

          <div className="mt-6">
            {status === 'loading' && (
              <div role="status" aria-label="Searching" className="text-center text-neutral-400">Searching…</div>
            )}

            {status === 'error' && (
              <div role="alert" className="text-center text-neutral-600">
                <p>Something went wrong with that search.</p>
                <button
                  type="button"
                  onClick={() => { setAttempt((prev) => prev + 1) }}
                  className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm"
                >
                  Try again
                </button>
              </div>
            )}

            {status === 'ready' && items.length === 0 && (
              <div className="text-center text-neutral-600">
                <p>{`No sandwiches found for "${search.q}". Try a different search or roll a new one!`}</p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Roll a sandwich
                </Link>
              </div>
            )}

            {status === 'ready' && items.length > 0 && (
              <>
                <ul className="space-y-3">
                  {items.map((result, index) => (
                    <ResultRow
                      key={`${result.source}-${result.slug}`}
                      result={result}
                      onOpen={() => {
                        captureSearchResultClicked({
                          query: search.q,
                          resultSource: result.source,
                          slug: result.slug,
                          position: index + 1,
                          surface: 'page',
                        })
                      }}
                    />
                  ))}
                </ul>
                {items.length < totalCount && (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-md border border-neutral-300 px-6 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
