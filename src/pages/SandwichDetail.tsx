import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { captureEncyclopediaEntryViewed, captureEncyclopediaTryThisClicked } from '@/analytics/events'
import { fetchSandwich, isSandwichEntry } from '@/api/database'
import type { CanonicalIngredients, SandwichEntry } from '@/api/database'
import MarkdownText from '@/components/MarkdownText'
import SandwichVisual from '@/components/SandwichVisual'
import SandwichCardPage from '@/components/sandwich-page/SandwichCardPage'
import TryThisSandwich from '@/components/sandwich-page/TryThisSandwich'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/data/categoryLabels'
import { DIETARY_DISCLAIMER, getDietaryTag, isDietaryTag } from '@/data/dietaryTags'
import { SITE_URL } from '@/data/site'
import { formatPostDate } from '@/utils/blogPost'
import { useIngredients } from '@/hooks/useIngredients'
import { readInitialData } from '@/utils/initialData'
import { entryDescription } from '@/seo/sandwichEntry'
import type { CategorySlug, Ingredient, SandwichComposition } from '@/types'

type State =
  | { status: 'loading' }
  | { status: 'success'; entry: SandwichEntry }
  | { status: 'not-found' }
  | { status: 'error' }

type Pools = Partial<Record<CategorySlug, Ingredient[]>>

const entrySentWithPage = (slug: string): SandwichEntry | undefined =>
  readInitialData({ path: `/sandwiches/${slug}`, isData: isSandwichEntry })

const knownCategories = (ingredients: CanonicalIngredients): Partial<Record<CategorySlug, { name: string }[]>> =>
  Object.fromEntries(
    CATEGORY_ORDER
      .map((slug) => [slug, ingredients[slug]] as const)
      .filter(([, items]) => items !== undefined && items.length > 0),
  )

const matchIngredients = (names: { name: string }[], pool: Ingredient[]): Ingredient[] =>
  names
    .map(({ name }) => pool.find((ingredient) => ingredient.name.toLowerCase() === name.toLowerCase()))
    .filter((match): match is Ingredient => match !== undefined)

const buildVisualComposition = (ingredients: CanonicalIngredients, pools: Pools): SandwichComposition | null => {
  const match = (slug: CategorySlug): Ingredient[] => matchIngredients(ingredients[slug] ?? [], pools[slug] ?? [])
  const composition: SandwichComposition = {
    bread: match('bread'),
    protein: match('protein'),
    cheese: match('cheese'),
    toppings: match('toppings'),
    condiments: match('condiments'),
    'chefs-special': match('chefs-special'),
  }
  const matched = Object.values(composition).some((items) => items.length > 0)
  return matched ? composition : null
}

function Hero({ entry, pools }: { entry: SandwichEntry; pools: Pools }) {
  if (entry.image_url !== null) {
    return <img src={entry.image_url} alt={entry.name} className="h-72 w-full rounded-lg object-cover" />
  }

  const composition = buildVisualComposition(entry.canonical_ingredients, pools)
  if (composition !== null) return <SandwichVisual composition={composition} />

  return <div role="img" aria-label="No image available" className="text-center text-6xl">🥪</div>
}

function Info({ entry, categoryNames }: { entry: SandwichEntry; categoryNames: Map<string, string> }) {
  const origin = [entry.origin_country, entry.origin_region].filter((part) => part !== null).join(' · ')
  const groups = CATEGORY_ORDER.flatMap((slug) => {
    const items = entry.canonical_ingredients[slug] ?? []
    return items.length > 0 ? [{ slug, items }] : []
  })

  return (
    <div className="space-y-6">
      {origin !== '' && <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{origin}</p>}
      {entry.alternative_names.length > 0 && (
        <p className="text-sm italic text-neutral-600">{`Also known as: ${entry.alternative_names.join(', ')}`}</p>
      )}
      {entry.description !== null && <p className="text-lg text-neutral-800">{entry.description}</p>}
      {entry.history !== null && <MarkdownText>{entry.history}</MarkdownText>}

      {groups.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold text-neutral-900">Ingredients</h2>
          <dl className="mt-2 space-y-2">
            {groups.map(({ slug, items }) => (
              <div key={slug}>
                <dt className="text-sm font-semibold text-neutral-700">
                  {categoryNames.get(slug) ?? CATEGORY_LABELS[slug]}
                </dt>
                <dd className="text-sm text-neutral-600">
                  {items.map((item) => <span key={item.name} className="mr-2 inline-block">{item.name}</span>)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {entry.dietary_tags.length > 0 && (
        <div>
          <ul className="flex flex-wrap gap-2">
            {entry.dietary_tags.filter(isDietaryTag).map((tag) => {
              const { label, kind } = getDietaryTag(tag)
              return (
                <li
                  key={tag}
                  className={`rounded-full px-3 py-1 text-xs ${
                    kind === 'avoid' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {label}
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">{DIETARY_DISCLAIMER}</p>
        </div>
      )}

      {entry.blog_posts.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-neutral-900">From the blog</h2>
          <ul className="mt-2 space-y-2">
            {entry.blog_posts.map((post) => (
              <li key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="text-primary underline">{post.title}</Link>
                <p className="text-xs text-neutral-500">
                  {`${formatPostDate(post.published_at)} · ${String(post.reading_time_minutes)} min read`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default function SandwichDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { categories, lookupPools } = useIngredients()
  const [state, setState] = useState<State>(() => {
    const sent = slug === undefined ? undefined : entrySentWithPage(slug)
    return sent === undefined ? { status: 'loading' } : { status: 'success', entry: sent }
  })

  useEffect(() => {
    if (slug === undefined) {
      setState({ status: 'not-found' })
      return
    }
    const sent = entrySentWithPage(slug)
    if (sent !== undefined) {
      setState({ status: 'success', entry: sent })
      captureEncyclopediaEntryViewed({ slug: sent.slug })
      return
    }
    setState({ status: 'loading' })
    fetchSandwich(slug)
      .then((entry) => {
        if (entry === null) {
          setState({ status: 'not-found' })
          return
        }
        setState({ status: 'success', entry })
        captureEncyclopediaEntryViewed({ slug: entry.slug })
      })
      .catch(() => { setState({ status: 'error' }) })
  }, [slug])

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading sandwich">
        <div className="text-neutral-500">Loading…</div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="mx-auto max-w-[480px] px-4 py-16 text-center text-neutral-600">
        Something went wrong loading this sandwich. Please try again.
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Sandwich not found</h1>
        <Link
          to="/sandwiches"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse all sandwiches
        </Link>
      </div>
    )
  }

  const { entry } = state
  const categoryNames = new Map(categories.map((category) => [category.slug, category.name]))
  const pageUrl = `${SITE_URL}/sandwiches/${entry.slug}`

  return (
    <>
      <Helmet>
        <title>{entry.name} | Between the Bread</title>
        <meta name="description" content={entryDescription(entry)} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={entry.name} />
        {entry.description !== null && <meta property="og:description" content={entry.description} />}
        {entry.image_url !== null && <meta property="og:image" content={entry.image_url} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
      </Helmet>
      <SandwichCardPage
        targetType="database"
        slug={entry.slug}
        targetId={entry.id}
        name={entry.name}
        avgRating={entry.avg_rating}
        ratingCount={entry.rating_count}
        heroVisual={<Hero entry={entry} pools={lookupPools} />}
        infoSection={<Info entry={entry} categoryNames={categoryNames} />}
        actionBar={
          <TryThisSandwich
            composition={knownCategories(entry.canonical_ingredients)}
            exact={false}
            onTry={() => { captureEncyclopediaTryThisClicked({ slug: entry.slug }) }}
          />
        }
      />
    </>
  )
}
