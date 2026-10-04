import { useEffect, useState } from 'react'
import UsernameField from '@/components/UsernameField'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { canSaveUsername, useUsernameCheck } from '@/hooks/useUsernameCheck'

type Props = {
  onSave: (username: string) => Promise<void>
  onLater: () => void
}

export default function UsernamePromptModal({ onSave, onLater }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const check = useUsernameCheck({ name })
  const dialogRef = useDialogFocus<HTMLDivElement>()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onLater() }
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('keydown', closeOnEscape) }
  }, [onLater])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(name)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save your username. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Pick a username" className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="font-display text-xl font-bold text-neutral-900">Pick a username</h2>
        <p className="mt-2 text-sm text-neutral-500">Choose the name other sandwich fans will see.</p>
        {error !== null && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (canSaveUsername(check) && !saving) void handleSave()
          }}
        >
          <UsernameField id="username-prompt" value={name} onChange={setName} check={check} />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSaveUsername(check) || saving}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              Save username
            </button>
            <button
              type="button"
              onClick={onLater}
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Later
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
