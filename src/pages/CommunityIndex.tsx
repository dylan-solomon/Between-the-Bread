import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { captureCommunityFiltered, captureCommunitySorted, captureCommunityViewed } from '@/analytics/events'
import { fetchCommunityLeaderboard, isCommunityPage } from '@/api/community'
import type { CommunityComposition, CommunityPage, CommunitySandwichSummary, CommunitySort } from '@/api/community'
import SandwichVisual from '@/components/SandwichVisual'
import type { VisualComposition } from '@/components/SandwichVisual'
import { DIETARY_DISCLAIMER, DIETARY_TAGS, getDietaryTag, isDietaryTag } from '@/data/dietaryTags'
import { SITE_URL } from '@/data/site'
import { useIngredients } from '@/hooks/useIngredients'
import { COMMUNITY_DESCRIPTION, COMMUNITY_TITLE } from '@/seo/listPages'
import { madeLabel, rankBadge } from '@/seo/communitySandwich'
import { readInitialData } from '@/utils/initialData'

const PAGE_SIZE = 24
const DEFAULT_SORT: CommunitySort = 'most_popular'

const SORT_OPTIONS: { value: CommunitySort; label: string }[] = [
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'most_popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
]

type Status = 'loading' | 'ready' | 'error'

type Filters = { sort: CommunitySort; diet: string[]; ingredient: string | undefined }

const isSort = (value: string | null): value is CommunitySort => SORT_OPTIONS.some((option) => option.value === value)

const readFilters = (params: URLSearchParams): Filters => {
  const sort = params.get('sort')
  return {
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    diet: (params.get('diet') ?? '').split(',').filter((tag) => tag !== ''),
    ingredient: params.get('ingredient') ?? undefined,
  }
}

const pageSentWithPage = (paramsKey: string): CommunityPage | undefined =>
  paramsKey === '' ? readInitialData({ path: '/community', isData: isCommunityPage }) : undefined

const hasActiveFilters = ({ diet, ingredient }: Filters): boolean => diet.length > 0 || ingredient !== undefined

const toVisual = (composition: CommunityComposition): VisualComposition => ({
  bread: composition.bread ?? [],
  protein: composition.protein ?? [],
  cheese: composition.cheese ?? [],
  toppings: composition.toppings ?? [],
  condiments: composition.condiments ?? [],
  'chefs-special': composition['chefs-special'] ?? [],
})

function RankBadge({ rank }: { rank: number }) {
  const badge = rankBadge(rank)
  return <span aria-label={badge.label} className={badge.className}>{badge.text}</span>
}

function CommunityCard({ sandwich }: { sandwich: CommunitySandwichSummary }) {
  const tags = sandwich.dietary_tags.filter(isDietaryTag).map(getDietaryTag)

  return (
    <li>
      <Link
        to={`/community/${sandwich.slug}`}
        className="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md"
      >
        <RankBadge rank={sandwich.rank} />
        <div className="bg-neutral-50 pt-4">
          <SandwichVisual size="compact" composition={toVisual(sandwich.composition)} />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h2 className="font-display text-lg font-bold text-neutral-900">{sandwich.name}</h2>
          {sandwich.fun_name !== null && <p className="text-sm italic text-neutral-500">{sandwich.fun_name}</p>}
          <p className="text-sm text-neutral-700">
            {sandwich.avg_rating === null ? 'Not yet rated' : `★ ${String(sandwich.avg_rating)} (${String(sandwich.rating_count)})`}
          </p>
          <p className="text-sm text-neutral-500">{madeLabel(sandwich.generated_count)}</p>
          {tags.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {tags.map(({ tag, label, kind }) => (
                <li
                  key={tag}
                  className={`rounded-full px-2 py-0.5 text-xs ${kind === 'avoid' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </li>
  )
}

export default function CommunityIndex() {
  const [params, setParams] = useSearchParams()
  const paramsKey = params.toString()
  const filters = readFilters(params)
  const { categories, pools } = useIngredients()

  const [sent] = useState(() => pageSentWithPage(paramsKey))
  const [items, setItems] = useState<CommunitySandwichSummary[]>(sent?.items ?? [])
  const [totalCount, setTotalCount] = useState(sent?.totalCount ?? 0)
  const [status, setStatus] = useState<Status>(sent === undefined ? 'loading' : 'ready')
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { captureCommunityViewed() }, [])

  useEffect(() => {
    const sentPage = attempt === 0 ? pageSentWithPage(paramsKey) : undefined
    if (sentPage !== undefined) {
      setItems(sentPage.items)
      setTotalCount(sentPage.totalCount)
      setStatus('ready')
      return
    }
    let cancelled = false
    setStatus('loading')
    const query = readFilters(new URLSearchParams(paramsKey))
    fetchCommunityLeaderboard({ ...query, limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setTotalCount(page.totalCount)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [paramsKey, attempt])

  const updateParams = (changes: Partial<Record<'sort' | 'diet' | 'ingredient', string>>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '') next.delete(key)
      else next.set(key, value)
    })
    setParams(next)
  }

  const changeSort = (sort: CommunitySort) => {
    if (sort === filters.sort) return
    captureCommunitySorted({ sort })
    updateParams({ sort: sort === DEFAULT_SORT ? '' : sort })
  }

  const changeFilters = (changes: Partial<Pick<Filters, 'diet' | 'ingredient'>>) => {
    const next = { ...filters, ...changes }
    captureCommunityFiltered({ diet: next.diet, ingredient: next.ingredient ?? null, sort: next.sort })
    updateParams({ diet: next.diet.join(','), ingredient: next.ingredient ?? '' })
  }

  const toggleDiet = (tag: string) => {
    changeFilters({
      diet: filters.diet.includes(tag) ? filters.diet.filter((existing) => existing !== tag) : [...filters.diet, tag],
    })
  }

  const loadMore = () => {
    setLoadingMore(true)
    fetchCommunityLeaderboard({ ...filters, limit: PAGE_SIZE, offset: items.length })
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
        <title>{COMMUNITY_TITLE}</title>
        <meta name="description" content={COMMUNITY_DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/community`} />
        <meta property="og:title" content={COMMUNITY_TITLE} />
        <meta property="og:description" content={COMMUNITY_DESCRIPTION} />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">Community Leaderboard</h1>
      <p className="mt-2 text-neutral-600">{COMMUNITY_DESCRIPTION}</p>

      <div role="group" aria-label="Sort by" className="mt-6 flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => {
          const active = filters.sort === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => { changeSort(option.value) }}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Ingredient
          <select
            value={filters.ingredient ?? ''}
            onChange={(e) => { changeFilters({ ingredient: e.target.value === '' ? undefined : e.target.value }) }}
            className={inputClass}
          >
            <option value="">Any ingredient</option>
            {categories.map((category) => {
              const options = pools[category.slug] ?? []
              return options.length === 0 ? null : (
                <optgroup key={category.slug} label={category.name}>
                  {options.map((ingredient) => (
                    <option key={`${category.slug}-${ingredient.slug}`} value={ingredient.slug}>{ingredient.name}</option>
                  ))}
                </optgroup>
              )
            })}
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
            <p>Something went wrong loading the leaderboard.</p>
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
            {hasActiveFilters(filters) ? (
              <>
                <p>No community sandwiches match these filters.</p>
                <button
                  type="button"
                  onClick={() => { updateParams({ diet: '', ingredient: '' }) }}
                  className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p>No community sandwiches yet. Save or share a sandwich and it will show up here.</p>
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Build a sandwich
                </Link>
              </>
            )}
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((sandwich) => <CommunityCard key={sandwich.id} sandwich={sandwich} />)}
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
