import { useState } from 'react'
import { Link } from 'react-router-dom'
import UsernameField from '@/components/UsernameField'
import { useUsername } from '@/context/UsernameContext'
import { canSaveUsername, useUsernameCheck } from '@/hooks/useUsernameCheck'

function UsernameForm({ current }: { current: string | null }) {
  const { saveUsername } = useUsername()
  const [name, setName] = useState(current ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const check = useUsernameCheck({ name, current })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveUsername(name)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save your username. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSaveUsername(check) && !saving) void handleSave()
      }}
    >
      {error !== null && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <UsernameField id="settings-username" value={name} onChange={setName} check={check} />
      <button
        type="submit"
        disabled={!canSaveUsername(check) || saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
      >
        Save username
      </button>
    </form>
  )
}

export default function UsernameSettings() {
  const { username } = useUsername()
  return (
    <>
      <UsernameForm key={username ?? 'none'} current={username} />
      {username !== null && (
        <Link to={`/u/${username}`} className="mt-3 inline-block text-sm text-primary underline">
          View your public profile
        </Link>
      )}
    </>
  )
}
