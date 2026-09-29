import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { fetchConfig, updateConfig } from '@/api/admin'

export default function ConfigPage() {
  const { session } = useAuth()
  const [costDataLastUpdated, setCostDataLastUpdated] = useState('')
  const [siteNotice, setSiteNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    if (session === null) return
    fetchConfig(session.access_token)
      .then((rows) => {
        const cost = rows.find((r) => r.key === 'cost_data_last_updated')
        const notice = rows.find((r) => r.key === 'site_notice')
        if (typeof cost?.value === 'string') setCostDataLastUpdated(cost.value)
        if (typeof notice?.value === 'string') setSiteNotice(notice.value)
      })
      .catch(() => { toast.error('Failed to load config.') })
      .finally(() => { setLoading(false) })
  }, [session])

  const save = async (key: string, value: unknown) => {
    if (session === null) return
    setSavingKey(key)
    try {
      await updateConfig(session.access_token, key, value)
      toast.success('Saved.')
    } catch {
      toast.error('Failed to save.')
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading...</p>

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">Config</h1>

      <div className="mt-6 max-w-md space-y-6">
        <div>
          <label htmlFor="cost-data-last-updated" className="block text-sm font-medium text-neutral-700">
            Cost data last updated
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="cost-data-last-updated"
              type="date"
              value={costDataLastUpdated}
              onChange={(e) => { setCostDataLastUpdated(e.target.value) }}
              className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
            <button
              type="button"
              disabled={savingKey === 'cost_data_last_updated'}
              onClick={() => { void save('cost_data_last_updated', costDataLastUpdated) }}
              className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              Save cost data date
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="site-notice" className="block text-sm font-medium text-neutral-700">
            Site notice
          </label>
          <textarea
            id="site-notice"
            rows={3}
            value={siteNotice}
            onChange={(e) => { setSiteNotice(e.target.value) }}
            placeholder="Leave empty to hide the site banner"
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
          />
          <button
            type="button"
            disabled={savingKey === 'site_notice'}
            onClick={() => { void save('site_notice', siteNotice.trim() === '' ? null : siteNotice) }}
            className="mt-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            Save site notice
          </button>

          {siteNotice.trim() !== '' && (
            <div role="status" className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {siteNotice}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
