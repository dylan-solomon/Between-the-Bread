import { describe, it, expect, vi } from 'vitest'
import { installStaleChunkReload } from '@/utils/staleChunkReload'

const makeStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    values,
  }
}

const setup = (options: { storage?: ReturnType<typeof makeStorage>; now?: number } = {}) => {
  const target = new EventTarget()
  const reload = vi.fn()
  const storage = options.storage ?? makeStorage()
  installStaleChunkReload({ target, storage, reload, now: () => options.now ?? 100_000 })
  const fire = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    target.dispatchEvent(event)
    return event
  }
  return { reload, storage, fire }
}

describe('installStaleChunkReload', () => {
  it('reloads the page when a page bundle from an older deploy fails to load', () => {
    const { reload, fire } = setup()

    const event = fire()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('remembers when it last reloaded', () => {
    const { storage, fire } = setup({ now: 123_456 })

    fire()

    expect(storage.values.get('btb_stale_chunk_reload')).toBe('123456')
  })

  it('does not reload again within ten seconds, so a missing file cannot cause a reload loop', () => {
    const { reload, fire } = setup({ storage: makeStorage({ btb_stale_chunk_reload: '95000' }), now: 100_000 })

    const event = fire()

    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('reloads again once ten seconds have passed', () => {
    const { reload, fire } = setup({ storage: makeStorage({ btb_stale_chunk_reload: '80000' }), now: 100_000 })

    fire()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('still reloads when storage is unavailable', () => {
    const storage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      values: new Map<string, string>(),
    }
    const { reload, fire } = setup({ storage })

    fire()

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
