import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { captureEncyclopediaFiltered, captureEncyclopediaSearched, captureEncyclopediaViewed } from '@/analytics/events'
import { fetchSandwiches } from '@/api/database'
import type { SandwichSort, SandwichSummary } from '@/api/database'
import { DIETARY_DISCLAIMER, DIETARY_TAGS } from '@/data/dietaryTags'
import { REGIONS } from '@/data/regions'
import type { Region } from '@/data/regions'

const PAGE_SIZE = 24
const SORT_OPTIONS: { value: SandwichSort; label: string }[] = [
  { value: 'name', label: 'A–Z' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
]

type Status = 'loading' | 'ready' | 'error'

type Filters = {
  q: string
  region: Region | undefined
  sort: SandwichSort | undefined
  diet: string[]
}

const isRegion = (value: string | null): value is Region =>
  REGIONS.some((region) => region === value)

const isSort = (value: string | null): value is SandwichSort =>
  SORT_OPTIONS.some((option) => option.value === value)

const readFilters = (params: URLSearchParams): Filters => {
  const region = params.get('region')
  const sort = params.get('sort')
  return {
    q: params.get('q') ?? '',
    region: isRegion(region) ? region : undefined,
    sort: isSort(sort) ? sort : undefined,
    diet: (params.get('diet') ?? '').split(',').filter((tag) => tag !== ''),
  }
}

const hasActiveFilters = ({ q, region, diet }: Filters): boolean => q !== '' || region !== undefined || diet.length > 0

function SandwichCard({ sandwich }: { sandwich: SandwichSummary }) {
  return (
    <li>
      <Link
        to={`/sandwiches/${sandwich.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md"
      >
        {sandwich.image_url === null ? (
          <div aria-hidden="true" className="flex h-40 items-center justify-center bg-neutral-100 text-5xl">🥪</div>
        ) : (
          <img src={sandwich.image_url} alt={sandwich.name} className="h-40 w-full object-cover" />
        )}
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h2 className="font-display text-lg font-bold text-neutral-900">{sandwich.name}</h2>
          {sandwich.alternative_names.length > 0 && (
            <p className="text-xs italic text-neutral-500">{`Also known as: ${sandwich.alternative_names.join(', ')}`}</p>
          )}
          {sandwich.origin_country !== null && (
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{sandwich.origin_country}</p>
          )}
          {sandwich.description !== null && (
            <p className="line-clamp-3 text-sm text-neutral-600">{sandwich.description}</p>
          )}
          <p className="mt-auto pt-2 text-sm text-neutral-700">
            {sandwich.avg_rating === null
              ? 'Not yet rated'
              : `★ ${String(sandwich.avg_rating)} (${String(sandwich.rating_count)})`}
          </p>
        </div>
      </Link>
    </li>
  )
}

export default function SandwichIndex() {
  const [params, setParams] = useSearchParams()
  const paramsKey = params.toString()
  const filters = readFilters(params)

  const [searchText, setSearchText] = useState(filters.q)
  const [items, setItems] = useState<SandwichSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { setSearchText(filters.q) }, [filters.q])

  useEffect(() => { captureEncyclopediaViewed() }, [])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    const query = readFilters(new URLSearchParams(paramsKey))
    fetchSandwiches({ ...query, limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setTotalCount(page.totalCount)
        setStatus('ready')
        if (query.q !== '') captureEncyclopediaSearched({ query: query.q, resultsCount: page.totalCount })
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [paramsKey, attempt])

  const updateParams = (changes: Partial<Record<'q' | 'region' | 'sort' | 'diet', string>>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '') next.delete(key)
      else next.set(key, value)
    })
    setParams(next)
  }

  const changeFilters = (changes: Partial<Pick<Filters, 'region' | 'sort' | 'diet'>>) => {
    const next = { ...filters, ...changes }
    captureEncyclopediaFiltered({ region: next.region ?? null, diet: next.diet, sort: next.sort ?? 'name' })
    updateParams({ region: next.region ?? '', sort: next.sort ?? '', diet: next.diet.join(',') })
  }

  const toggleDiet = (tag: string) => {
    changeFilters({ diet: filters.diet.includes(tag) ? filters.diet.filter((t) => t !== tag) : [...filters.diet, tag] })
  }

  const loadMore = () => {
    setLoadingMore(true)
    fetchSandwiches({ ...filters, limit: PAGE_SIZE, offset: items.length })
      .then((page) => {
        setItems((prev) => [...prev, ...page.items])
        setTotalCount(page.totalCount)
      })
      .catch(() => { toast.error('Failed to load more sandwiches.') })
      .finally(() => { setLoadingMore(false) })
  }

  const inputClass = 'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>Sandwich Encyclopedia | Between the Bread</title>
        <meta property="og:title" content="Sandwich Encyclopedia | Between the Bread" />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">Sandwich Encyclopedia</h1>
      <p className="mt-2 text-neutral-600">Iconic sandwiches from around the world, and the stories behind them.</p>

      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); updateParams({ q: searchText.trim() }) }}
        className="mt-6 flex gap-2"
      >
        <input
          type="search"
          aria-label="Search sandwiches"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value) }}
          placeholder="Search by name, country or ingredient"
          className={`${inputClass} flex-1`}
        />
        <button type="submit" className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Region
          <select
            value={filters.region ?? ''}
            onChange={(e) => { changeFilters({ region: isRegion(e.target.value) ? e.target.value : undefined }) }}
            className={inputClass}
          >
            <option value="">All regions</option>
            {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Sort by
          <select
            value={filters.sort ?? 'name'}
            onChange={(e) => { changeFilters({ sort: isSort(e.target.value) && e.target.value !== 'name' ? e.target.value : undefined }) }}
            className={inputClass}
          >
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <fieldset className="flex flex-wrap gap-3">
          <legend className="sr-only">Dietary</legend>
          {DIETARY_TAGS.map(({ tag, filterLabel }) => (
            <label key={tag} className="flex items-center gap-1 text-sm text-neutral-700">
              <input type="checkbox" checked={filters.diet.includes(tag)} onChange={() => { toggleDiet(tag) }} />
              {filterLabel}
            </label>
          ))}
        </fieldset>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{DIETARY_DISCLAIMER}</p>

      <div className="mt-8">
        {status === 'loading' && (
          <div role="status" aria-label="Loading sandwiches" className="text-center text-neutral-400">Loading…</div>
        )}

        {status === 'error' && (
          <div role="alert" className="text-center text-neutral-600">
            <p>Something went wrong loading sandwiches.</p>
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
            <p>No sandwiches match your search.</p>
            {hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={() => { setParams(new URLSearchParams()) }}
                className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              {totalCount === 1 ? '1 sandwich' : `${String(totalCount)} sandwiches`}
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((sandwich) => <SandwichCard key={sandwich.slug} sandwich={sandwich} />)}
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
    </div>
  )
}
