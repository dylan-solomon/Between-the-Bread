import { describe, it, expect } from 'vitest'
import { whenRouterReady } from '@/utils/routerReady'

type Listener = (state: { initialized: boolean }) => void

const makeRouter = (initialized: boolean) => {
  const listeners: Listener[] = []
  return {
    state: { initialized },
    subscribe: (listener: Listener) => {
      listeners.push(listener)
      return () => { listeners.splice(listeners.indexOf(listener), 1) }
    },
    publish: (state: { initialized: boolean }) => { [...listeners].forEach((listener) => { listener(state) }) },
    listenerCount: () => listeners.length,
  }
}

const settled = async (promise: Promise<void>): Promise<boolean> => {
  const marker = Symbol('pending')
  const result = await Promise.race([promise.then(() => true), Promise.resolve(marker)])
  return result === true
}

describe('whenRouterReady', () => {
  it('resolves straight away when the router is already initialized', async () => {
    const router = makeRouter(true)

    await expect(whenRouterReady(router)).resolves.toBeUndefined()
    expect(router.listenerCount()).toBe(0)
  })

  it('waits until the router reports it is initialized, then stops listening', async () => {
    const router = makeRouter(false)
    const ready = whenRouterReady(router)

    router.publish({ initialized: false })
    expect(await settled(ready)).toBe(false)

    router.publish({ initialized: true })
    await expect(ready).resolves.toBeUndefined()
    expect(router.listenerCount()).toBe(0)
  })
})
