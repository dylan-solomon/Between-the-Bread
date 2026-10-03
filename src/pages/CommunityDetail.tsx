import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { fetchCommunitySandwich, isCommunitySandwich } from '@/api/community'
import type { CommunitySandwich } from '@/api/community'
import AdminBadge from '@/components/AdminBadge'
import SandwichVisual from '@/components/SandwichVisual'
import SandwichCardPage from '@/components/sandwich-page/SandwichCardPage'
import TryThisSandwich from '@/components/sandwich-page/TryThisSandwich'
import { CATEGORY_LABELS } from '@/data/categoryLabels'
import { DIETARY_DISCLAIMER, getDietaryTag, isDietaryTag } from '@/data/dietaryTags'
import { SITE_URL } from '@/data/site'
import { communityDescription, communityGroups, madeLabel } from '@/seo/communitySandwich'
import { formatPostDate } from '@/utils/blogPost'
import { readInitialData } from '@/utils/initialData'

type State =
  | { status: 'loading' }
  | { status: 'ready'; sandwich: CommunitySandwich }
  | { status: 'not-found' }
  | { status: 'error' }

const sandwichSentWithPage = (slug: string): CommunitySandwich | undefined =>
  readInitialData({ path: `/community/${slug}`, isData: isCommunitySandwich })

function FirstMade({ sandwich }: { sandwich: CommunitySandwich }) {
  const date = formatPostDate(sandwich.created_at)
  const maker = sandwich.first_made_by

  if (maker === null) return <p className="text-sm text-neutral-600">{`First made on ${date}`}</p>

  return (
    <p className="text-sm text-neutral-600">
      First made by{' '}
      <Link to={`/u/${maker.username}`} className="font-medium text-neutral-900 hover:text-primary hover:underline">
        {`@${maker.username}`}
      </Link>
      {maker.is_admin && <AdminBadge />}
      {` on ${date}`}
    </p>
  )
}

function Info({ sandwich }: { sandwich: CommunitySandwich }) {
  const groups = communityGroups(sandwich.composition)
  const tags = sandwich.dietary_tags.filter(isDietaryTag).map(getDietaryTag)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{madeLabel(sandwich.generated_count)}</p>
        <FirstMade sandwich={sandwich} />
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-neutral-900">Ingredients</h2>
        <dl className="mt-2 space-y-2">
          {groups.map(({ slug, items }) => (
            <div key={slug}>
              <dt className="text-sm font-semibold text-neutral-700">{CATEGORY_LABELS[slug]}</dt>
              <dd className="text-sm text-neutral-600">
                {items.map((item) => <span key={item.slug} className="mr-2 inline-block">{item.name}</span>)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {tags.length > 0 && (
        <div>
          <ul className="flex flex-wrap gap-2">
            {tags.map(({ tag, label, kind }) => (
              <li
                key={tag}
                className={`rounded-full px-3 py-1 text-xs ${kind === 'avoid' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}
              >
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-400">{DIETARY_DISCLAIMER}</p>
        </div>
      )}
    </div>
  )
}

export default function CommunityDetail() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>(() => {
    const sent = sandwichSentWithPage(slug)
    return sent === undefined ? { status: 'loading' } : { status: 'ready', sandwich: sent }
  })

  useEffect(() => {
    const sent = sandwichSentWithPage(slug)
    if (sent !== undefined) {
      setState({ status: 'ready', sandwich: sent })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    fetchCommunitySandwich(slug)
      .then((sandwich) => {
        if (!cancelled) setState(sandwich === null ? { status: 'not-found' } : { status: 'ready', sandwich })
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [slug])

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading sandwich">
        <div className="text-neutral-400">Loading…</div>
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
        <Helmet>
          <title>Sandwich not found | Between the Bread</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Sandwich not found</h1>
        <Link
          to="/community"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse the leaderboard
        </Link>
      </div>
    )
  }

  const { sandwich } = state
  const pageUrl = `${SITE_URL}/community/${sandwich.slug}`
  const title = sandwich.fun_name ?? sandwich.name
  const description = communityDescription(sandwich)
  const composition = Object.fromEntries(communityGroups(sandwich.composition).map(({ slug: category, items }) => [category, items]))

  return (
    <>
      <Helmet>
        <title>{`${title} | Community | Between the Bread`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        {sandwich.rating_count === 0 && <meta name="robots" content="noindex" />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
      </Helmet>
      <SandwichCardPage
        targetType="community"
        slug={sandwich.slug}
        targetId={sandwich.id}
        name={sandwich.name}
        funName={sandwich.fun_name ?? undefined}
        avgRating={sandwich.avg_rating}
        ratingCount={sandwich.rating_count}
        heroVisual={
          <SandwichVisual
            composition={{
              bread: sandwich.composition.bread ?? [],
              protein: sandwich.composition.protein,
              cheese: sandwich.composition.cheese,
              toppings: sandwich.composition.toppings,
              condiments: sandwich.composition.condiments,
              'chefs-special': sandwich.composition['chefs-special'],
            }}
          />
        }
        infoSection={<Info sandwich={sandwich} />}
        actionBar={<TryThisSandwich composition={composition} exact />}
      />
    </>
  )
}
