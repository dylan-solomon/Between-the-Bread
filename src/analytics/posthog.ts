import posthog from 'posthog-js'

const doInit = (): void => {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined
  if (!key) return

  posthog.init(key, {
    api_host: host ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage',
    session_recording: { sampleRate: 0.01 },
  })
}

export const initPostHog = (): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(doInit)
  } else {
    setTimeout(doInit, 1)
  }
}
