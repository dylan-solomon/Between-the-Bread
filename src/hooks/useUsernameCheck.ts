import { useEffect, useState } from 'react'
import { checkUsername, usernameFormatProblem } from '@/api/usernames'
import type { UsernameStatus } from '@/api/usernames'

type AnswerStatus = UsernameStatus | 'error'

export type UsernameCheckStatus = AnswerStatus | 'idle' | 'checking'

export type UsernameCheck = { status: UsernameCheckStatus; message: string | null }

export const canSaveUsername = (check: UsernameCheck): boolean =>
  check.status === 'available' || check.status === 'error'

const DEBOUNCE_MS = 300

const MESSAGES: Record<AnswerStatus, string> = {
  available: 'Available!',
  taken: 'That username is already taken.',
  reserved: "That username isn't available.",
  invalid: 'Usernames are 3 to 20 letters, numbers or underscores.',
  error: "Couldn't check that username. You can still try saving it.",
}

const IDLE: UsernameCheck = { status: 'idle', message: null }
const CHECKING: UsernameCheck = { status: 'checking', message: 'Checking…' }

type Options = { name: string; current?: string | null }

export const useUsernameCheck = ({ name, current = null }: Options): UsernameCheck => {
  const [answer, setAnswer] = useState<{ name: string; status: AnswerStatus } | null>(null)
  const unchanged = name === '' || (current !== null && name.toLowerCase() === current.toLowerCase())
  const problem = unchanged ? null : usernameFormatProblem(name)
  const needsCheck = !unchanged && problem === null

  useEffect(() => {
    if (!needsCheck) return
    let cancelled = false
    const timer = setTimeout(() => {
      checkUsername(name)
        .then((status) => { if (!cancelled) setAnswer({ name, status }) })
        .catch(() => { if (!cancelled) setAnswer({ name, status: 'error' }) })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [name, needsCheck])

  if (unchanged) return IDLE
  if (problem !== null) return { status: 'invalid', message: problem }
  if (answer === null || answer.name !== name) return CHECKING
  return { status: answer.status, message: MESSAGES[answer.status] }
}
