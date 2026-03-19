import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { fetchShare, type ShareRecord } from '@/api/shareApi'
import { captureShareLinkVisited, captureShareMakeYourOwnClicked } from '@/analytics/events'
import SummaryCard from '@/components/SummaryCard'

type State =
  | { status: 'loading' }
  | { status: 'success'; record: ShareRecord }
  | { status: 'error' }

export default function SharedSandwich() {
  const { hash } = useParams<{ hash: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (hash === undefined) {
      setState({ status: 'error' })
      return
    }

    fetchShare(hash)
      .then((record) => {
        setState({ status: 'success', record })
        captureShareLinkVisited({ hash, sandwichName: record.name })
      })
      .catch(() => {
        setState({ status: 'error' })
      })
  }, [hash])

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading sandwich">
        <div className="text-neutral-400">Loading…</div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="mx-auto max-w-[480px] px-4 py-16 text-center"
      >
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          This Sandwich Has Expired
        </h1>
        <p className="mt-4 text-neutral-600">
          This shared sandwich link is no longer available.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          onClick={() => { if (hash !== undefined) captureShareMakeYourOwnClicked({ sourceHash: hash }) }}
        >
          Make your own
        </Link>
      </div>
    )
  }

  const { record } = state
  const shareUrl = `https://betweenbread.co/s/${record.hash}`

  return (
    <div className="mx-auto max-w-[480px] px-4 py-16">
      <Helmet>
        <title>{record.name} | Between the Bread</title>
        <meta property="og:title" content={record.name} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      <SummaryCard composition={record.composition} isRolling={false} />
      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          onClick={() => { captureShareMakeYourOwnClicked({ sourceHash: record.hash }) }}
        >
          Make your own
        </Link>
      </div>
    </div>
  )
}
