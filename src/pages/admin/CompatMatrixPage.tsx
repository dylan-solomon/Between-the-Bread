import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { fetchCompatMatrix } from '@/api/compatMatrix'
import { updateCompatMatrix } from '@/api/admin'
import type { CompatGroup } from '@/types'

const GROUPS: CompatGroup[] = [
  'american',
  'asian_fusion',
  'deli_classic',
  'italian',
  'mediterranean',
  'neutral',
  'southern',
  'tex_mex',
]

const pairKey = (a: string, b: string): string => `${a}|${b}`

export default function CompatMatrixPage() {
  const { session } = useAuth()
  const [affinities, setAffinities] = useState<Record<string, number>>({})
  const [dirty, setDirty] = useState<Map<string, { group_a: CompatGroup; group_b: CompatGroup; affinity: number }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCompatMatrix()
      .then((rows) => {
        const next: Record<string, number> = {}
        for (const row of rows) next[pairKey(row.group_a, row.group_b)] = row.affinity
        setAffinities(next)
      })
      .catch(() => { toast.error('Failed to load compatibility matrix.') })
      .finally(() => { setLoading(false) })
  }, [])

  const handleChange = (a: CompatGroup, b: CompatGroup, value: number) => {
    setAffinities((prev) => ({ ...prev, [pairKey(a, b)]: value, [pairKey(b, a)]: value }))
    setDirty((prev) => new Map(prev).set(pairKey(a, b), { group_a: a, group_b: b, affinity: value }))
  }

  const handleSave = async () => {
    if (session === null) return
    setSaving(true)
    try {
      await Promise.all(
        Array.from(dirty.values()).map((pair) => updateCompatMatrix(session.access_token, pair)),
      )
      setDirty(new Map())
      toast.success('Compatibility matrix saved.')
    } catch {
      toast.error('Failed to save compatibility matrix.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading...</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Compatibility Matrix</h1>
        <button
          type="button"
          disabled={dirty.size === 0 || saving}
          onClick={() => { void handleSave() }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-1"><span className="sr-only">Flavour group</span></th>
              {GROUPS.map((g) => (
                <th key={g} className="p-1 text-xs font-medium text-neutral-500">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((rowGroup) => (
              <tr key={rowGroup}>
                <th className="p-1 text-left text-xs font-medium text-neutral-500">{rowGroup}</th>
                {GROUPS.map((colGroup) => (
                  <td key={colGroup} className="p-1">
                    {rowGroup === colGroup ? (
                      <span className="block text-center text-neutral-300">—</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        aria-label={`${rowGroup} to ${colGroup} affinity`}
                        value={affinities[pairKey(rowGroup, colGroup)] ?? 0}
                        onChange={(e) => { handleChange(rowGroup, colGroup, Number(e.target.value)) }}
                        className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-center text-xs"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
