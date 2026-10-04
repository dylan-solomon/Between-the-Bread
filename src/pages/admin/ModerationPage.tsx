import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { fetchModerationQueue, moderateItem } from '@/api/admin'
import type { ModerationComment, ModerationPhoto, ModerationResource } from '@/api/admin'

type Item = ModerationComment | ModerationPhoto

const isComment = (item: Item): item is ModerationComment => 'body' in item

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ModerationPage() {
  const { session } = useAuth()
  const [resource, setResource] = useState<ModerationResource>('comments')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (nextResource: ModerationResource) => {
    if (session === null) return
    setLoading(true)
    setSelected(new Set())
    try {
      const data = await fetchModerationQueue<ModerationComment[] | ModerationPhoto[]>(session.access_token, nextResource)
      setItems(data)
    } catch {
      toast.error('Failed to load moderation queue.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void load(resource)
  }, [resource, load])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (session === null) return
    try {
      await moderateItem(session.access_token, resource, id, action)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      toast.error(`Failed to ${action} item.`)
    }
  }

  const handleBulk = async (action: 'approve' | 'reject') => {
    if (session === null || selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all(Array.from(selected).map((id) => moderateItem(session.access_token, resource, id, action)))
      setItems((prev) => prev.filter((item) => !selected.has(item.id)))
      setSelected(new Set())
      toast.success(`${action === 'approve' ? 'Approved' : 'Rejected'} ${String(selected.size)} item(s).`)
    } catch {
      toast.error(`Failed to ${action} selected items.`)
    } finally {
      setBusy(false)
    }
  }

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))))
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">Moderation</h1>

      <div role="tablist" aria-label="Moderation queue" className="mt-4 flex border-b border-neutral-200">
        {([{ value: 'comments', label: 'Comments' }, { value: 'photos', label: 'Photos' }] as const).map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={resource === tab.value}
            onClick={() => { setResource(tab.value) }}
            className={`px-4 py-2 text-sm font-medium transition ${
              resource === tab.value ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-4 text-sm text-neutral-500">Loading...</p>}

      {!loading && items.length === 0 && (
        <p className="mt-6 text-center text-sm text-neutral-500">Nothing pending review.</p>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-neutral-600">
              <input
                type="checkbox"
                aria-label="Select all visible"
                checked={selected.size === items.length}
                onChange={toggleSelectAll}
                className="rounded border-neutral-300"
              />
              Select all visible
            </label>
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => { void handleBulk('approve') }}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm font-medium text-neutral-700 disabled:opacity-50"
            >
              Approve selected
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => { void handleBulk('reject') }}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm font-medium text-neutral-700 disabled:opacity-50"
            >
              Reject selected
            </button>
          </div>

          <ul className="mt-4 divide-y divide-neutral-200">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <input
                  type="checkbox"
                  aria-label={`Select item ${item.id}`}
                  checked={selected.has(item.id)}
                  onChange={() => { toggleSelect(item.id) }}
                  className="mt-1 rounded border-neutral-300"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-neutral-800">
                    {isComment(item) ? item.body : (item.caption ?? item.storage_path)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    By user {item.user_id.slice(0, 8)} &middot; {item.target_type}/{item.target_id} &middot; {formatDate(item.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => { void handleAction(item.id, 'approve') }}
                    className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleAction(item.id, 'reject') }}
                    className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
