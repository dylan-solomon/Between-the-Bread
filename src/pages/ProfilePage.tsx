import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { fetchPublicProfile } from '@/api/profiles'
import type { PublicProfile } from '@/api/profiles'
import AdminBadge from '@/components/AdminBadge'

type State =
  | { status: 'loading' }
  | { status: 'ready'; profile: PublicProfile }
  | { status: 'not-found' }
  | { status: 'error' }

const joinedLabel = (iso: string): string =>
  `Joined ${new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`

const commentLabel = (count: number): string => {
  if (count === 0) return 'No comments yet'
  return count === 1 ? '1 comment' : `${String(count)} comments`
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetchPublicProfile(username)
      .then((profile) => {
        if (!cancelled) setState(profile === null ? { status: 'not-found' } : { status: 'ready', profile })
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [username])

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <Helmet>
        <title>{state.status === 'ready' ? `@${state.profile.username} | Between the Bread` : 'Profile | Between the Bread'}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {state.status === 'loading' && (
        <div role="status" aria-label="Loading profile" className="text-center text-neutral-400">Loading…</div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="text-center text-neutral-600">Something went wrong loading this profile.</div>
      )}

      {state.status === 'not-found' && (
        <h1 className="text-center font-display text-2xl font-bold text-neutral-900">Profile not found</h1>
      )}

      {state.status === 'ready' && (
        <>
          <h1 className="font-display text-3xl font-bold text-neutral-900">
            {`@${state.profile.username}`}
            {state.profile.is_admin && <AdminBadge />}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{joinedLabel(state.profile.joined_at)}</p>
          <p className="mt-6 text-neutral-700">{commentLabel(state.profile.comment_count)}</p>
        </>
      )}
    </div>
  )
}
