import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockLoad, mockDisable } = vi.hoisted(() => ({ mockLoad: vi.fn(), mockDisable: vi.fn() }))

vi.mock('@/analytics/client', () => ({ loadPostHog: mockLoad, disableAnalytics: mockDisable }))

import { initPostHog } from '@/analytics/posthog'

beforeEach(() => {
  vi.clearAllMocks()
  mockLoad.mockResolvedValue(undefined)
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => { callback() })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('initPostHog', () => {
  it('turns analytics off when no PostHog key is set', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')

    initPostHog()

    expect(mockDisable).toHaveBeenCalled()
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('loads PostHog once the browser is idle and sets it up with the project key', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com')

    initPostHog()

    expect(mockLoad).toHaveBeenCalledTimes(1)
    const init = mockLoad.mock.calls[0][0] as (posthog: { init: (key: string, options: unknown) => void }) => void
    const fake = { init: vi.fn() }
    init(fake)
    expect(fake.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      api_host: 'https://us.i.posthog.com',
      capture_pageview: false,
      autocapture: false,
      session_recording: { sampleRate: 0.01 },
    }))
  })
})
