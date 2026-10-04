import type { PostHog } from 'posthog-js'

type Call = (posthog: PostHog) => void

type State =
  | { status: 'waiting'; pending: readonly Call[] }
  | { status: 'ready'; posthog: PostHog }
  | { status: 'off' }

const MAX_PENDING = 200

let state: State = { status: 'waiting', pending: [] }

const currentState = (): State => state

export const withPostHog = (call: Call): void => {
  if (state.status === 'ready') {
    call(state.posthog)
    return
  }
  if (state.status === 'waiting' && state.pending.length < MAX_PENDING) {
    state = { status: 'waiting', pending: [...state.pending, call] }
  }
}

export const disableAnalytics = (): void => {
  state = { status: 'off' }
}

export const loadPostHog = async (init: (posthog: PostHog) => void): Promise<void> => {
  if (currentState().status !== 'waiting') return
  const { default: posthog } = await import('posthog-js')
  const before = currentState()
  if (before.status !== 'waiting') return
  init(posthog)
  state = { status: 'ready', posthog }
  before.pending.forEach((call) => { call(posthog) })
}
