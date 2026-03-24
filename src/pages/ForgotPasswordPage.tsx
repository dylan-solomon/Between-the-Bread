import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (resetError) {
      setError(resetError.message)
      setSubmitting(false)
      return
    }

    setSent(true)
    setSubmitting(false)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-neutral-900">Forgot password</h1>

        {sent ? (
          <div className="mt-6">
            <p className="text-neutral-600">
              Check your email for a password reset link. It may take a minute to arrive.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            {error !== null && (
              <div role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <p className="mt-4 text-sm text-neutral-600">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                  required
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Send reset link
              </button>
            </form>

            <Link to="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </AppShell>
  )
}
