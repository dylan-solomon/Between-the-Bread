import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockInit, mockCapture } = vi.hoisted(() => ({
  mockInit: vi.fn<(key: string, options: unknown) => void>(),
  mockCapture: vi.fn<(event: string) => void>(),
}))

vi.mock('posthog-js', () => ({ default: { init: mockInit, capture: mockCapture } }))

type Client = typeof import('@/analytics/client')

const freshClient = async (): Promise<Client> => {
  vi.resetModules()
  const client: Client = await import('@/analytics/client')
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('analytics client', () => {
  it('holds calls made before PostHog loads and sends them in order once it has', async () => {
    const client = await freshClient()

    client.withPostHog((posthog) => { posthog.capture('first') })
    client.withPostHog((posthog) => { posthog.capture('second') })
    expect(mockCapture).not.toHaveBeenCalled()

    await client.loadPostHog((posthog) => { posthog.init('key', {}) })

    expect(mockInit).toHaveBeenCalledWith('key', {})
    expect(mockCapture.mock.calls.map((call) => call[0])).toEqual(['first', 'second'])
  })

  it('sends calls straight away once PostHog has loaded', async () => {
    const client = await freshClient()
    await client.loadPostHog(() => undefined)

    client.withPostHog((posthog) => { posthog.capture('later') })

    expect(mockCapture).toHaveBeenCalledWith('later')
  })

  it('drops held calls and ignores new ones when analytics is turned off', async () => {
    const client = await freshClient()
    client.withPostHog((posthog) => { posthog.capture('held') })

    client.disableAnalytics()
    client.withPostHog((posthog) => { posthog.capture('ignored') })
    await client.loadPostHog(() => undefined)

    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('does not start PostHog when analytics is turned off while it loads', async () => {
    const client = await freshClient()
    client.withPostHog((posthog) => { posthog.capture('held') })

    const loading = client.loadPostHog((posthog) => { posthog.init('key', {}) })
    client.disableAnalytics()
    await loading

    expect(mockInit).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('holds no more than 200 calls while waiting', async () => {
    const client = await freshClient()

    Array.from({ length: 250 }, (_, index) => index).forEach((index) => {
      client.withPostHog((posthog) => { posthog.capture(`event-${String(index)}`) })
    })
    await client.loadPostHog(() => undefined)

    expect(mockCapture).toHaveBeenCalledTimes(200)
    expect(mockCapture.mock.calls[0][0]).toBe('event-0')
  })
})
