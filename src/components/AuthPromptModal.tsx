import { useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'

type Props = {
  isOpen: boolean
  actionLabel: string
  onDismiss: () => void
}

export default function AuthPromptModal({ isOpen, actionLabel, onDismiss }: Props) {
  const location = useLocation()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    },
    [onDismiss],
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const redirectParam = encodeURIComponent(location.pathname + location.search)

  return (
    <div
      data-testid="auth-prompt-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Log in to ${actionLabel}`}
        className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => { e.stopPropagation() }}
      >
        <h2 className="font-display text-xl font-bold text-neutral-900">
          Log in to {actionLabel}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Create a free account or log in to unlock this feature.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to={`/login?redirect=${redirectParam}`}
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
