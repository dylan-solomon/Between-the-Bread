import { disableAnalytics, loadPostHog } from '@/analytics/client'

const DEFAULT_HOST = 'https://us.i.posthog.com'

const whenIdle = (run: () => void): void => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run)
  else setTimeout(run, 1)
}

export const initPostHog = (): void => {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined
  if (!key) {
    disableAnalytics()
    return
  }

  whenIdle(() => {
    void loadPostHog((posthog) => {
      posthog.init(key, {
        api_host: host ?? DEFAULT_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: false,
        persistence: 'localStorage',
        session_recording: { sampleRate: 0.01 },
      })
    })
  })
}
