import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/context/AuthContext'
import type { DietaryTag } from '@/types'

const DIETARY_OPTIONS: readonly { tag: DietaryTag; label: string }[] = [
  { tag: 'vegetarian', label: 'Vegetarian' },
  { tag: 'vegan', label: 'Vegan' },
  { tag: 'gluten_free', label: 'Gluten-Free' },
  { tag: 'dairy_free', label: 'Dairy-Free' },
]

type ProfileFormState = {
  display_name: string
  dietary_filters: DietaryTag[]
  smart_mode_default: boolean
  double_protein: boolean
  double_cheese: boolean
  cost_context: 'retail' | 'restaurant'
}

const INITIAL_STATE: ProfileFormState = {
  display_name: '',
  dietary_filters: [],
  smart_mode_default: false,
  double_protein: false,
  double_cheese: false,
  cost_context: 'retail',
}

export default function SettingsPage() {
  const { loading: authLoading, authenticated } = useRequireAuth()
  const { session } = useAuth()
  const [form, setForm] = useState<ProfileFormState>(INITIAL_STATE)
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authenticated || session === null) return

    const fetchProfile = async () => {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const json = await res.json() as { data: { profile: Omit<ProfileFormState, 'display_name'> & { display_name: string | null } } }
        const profile = json.data.profile
        setForm({
          display_name: profile.display_name ?? '',
          dietary_filters: profile.dietary_filters,
          smart_mode_default: profile.smart_mode_default,
          double_protein: profile.double_protein,
          double_cheese: profile.double_cheese,
          cost_context: profile.cost_context,
        })
      }

      setProfileLoading(false)
    }

    void fetchProfile()
  }, [authenticated, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (session === null) return

    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setSuccessMessage('Settings saved.')
    } else {
      setErrorMessage('Failed to save settings. Please try again.')
    }

    setSaving(false)
  }

  const toggleDietaryFilter = (tag: DietaryTag) => {
    setForm((prev) => ({
      ...prev,
      dietary_filters: prev.dietary_filters.includes(tag)
        ? prev.dietary_filters.filter((t) => t !== tag)
        : [...prev.dietary_filters, tag],
    }))
  }

  if (authLoading || !authenticated) return null

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-neutral-900">Settings</h1>

        {profileLoading && (
          <p className="mt-8 text-sm text-neutral-500">Loading preferences...</p>
        )}

        {!profileLoading && (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-6">
            <div>
              <label htmlFor="display-name" className="block text-sm font-medium text-neutral-700">
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={form.display_name}
                onChange={(e) => { setForm((prev) => ({ ...prev, display_name: e.target.value })) }}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-neutral-700">Default Dietary Filters</legend>
              <div className="mt-2 space-y-2">
                {DIETARY_OPTIONS.map(({ tag, label }) => (
                  <label key={tag} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={form.dietary_filters.includes(tag)}
                      onChange={() => { toggleDietaryFilter(tag) }}
                      className="rounded border-neutral-300 text-primary focus:ring-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.smart_mode_default}
                  onChange={(e) => { setForm((prev) => ({ ...prev, smart_mode_default: e.target.checked })) }}
                  className="rounded border-neutral-300 text-primary focus:ring-primary"
                />
                Smart Mode
              </label>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.double_protein}
                  onChange={(e) => { setForm((prev) => ({ ...prev, double_protein: e.target.checked })) }}
                  className="rounded border-neutral-300 text-primary focus:ring-primary"
                />
                Double Protein
              </label>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.double_cheese}
                  onChange={(e) => { setForm((prev) => ({ ...prev, double_cheese: e.target.checked })) }}
                  className="rounded border-neutral-300 text-primary focus:ring-primary"
                />
                Double Cheese
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-neutral-700">Cost Display</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="radio"
                    name="cost_context"
                    value="retail"
                    checked={form.cost_context === 'retail'}
                    onChange={() => { setForm((prev) => ({ ...prev, cost_context: 'retail' })) }}
                    className="border-neutral-300 text-primary focus:ring-primary"
                  />
                  Retail
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="radio"
                    name="cost_context"
                    value="restaurant"
                    checked={form.cost_context === 'restaurant'}
                    onChange={() => { setForm((prev) => ({ ...prev, cost_context: 'restaurant' })) }}
                    className="border-neutral-300 text-primary focus:ring-primary"
                  />
                  Restaurant
                </label>
              </div>
            </fieldset>

            {errorMessage !== null && (
              <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage !== null && (
              <p className="text-sm text-green-700">{successMessage}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  )
}
