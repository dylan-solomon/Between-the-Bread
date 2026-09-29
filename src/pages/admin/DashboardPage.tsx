import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { fetchDashboardMetrics } from '@/api/admin'
import type { DashboardMetrics } from '@/api/admin'

const TILES: { key: keyof DashboardMetrics; label: string }[] = [
  { key: 'total_users', label: 'Total Users' },
  { key: 'total_saved_sandwiches', label: 'Total Saved Sandwiches' },
  { key: 'total_shared_links', label: 'Total Shared Links' },
  { key: 'total_ratings', label: 'Total Ratings' },
  { key: 'pending_moderation_count', label: 'Pending Moderation' },
]

export default function DashboardPage() {
  const { session } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session === null) return
    fetchDashboardMetrics(session.access_token)
      .then(setMetrics)
      .catch(() => { toast.error('Failed to load dashboard metrics.') })
      .finally(() => { setLoading(false) })
  }, [session])

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900">Dashboard</h1>

      {loading && <p className="mt-4 text-sm text-neutral-500">Loading...</p>}

      {!loading && metrics !== null && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TILES.map((tile) => (
            <div key={tile.key} className="rounded-md border border-neutral-200 bg-white p-4">
              <p className="text-xs text-neutral-500">{tile.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{metrics[tile.key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
