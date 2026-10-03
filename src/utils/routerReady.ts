type RouterLike = {
  state: { initialized: boolean }
  subscribe: (listener: (state: { initialized: boolean }) => void) => () => void
}

export const whenRouterReady = (router: RouterLike): Promise<void> =>
  new Promise((resolve) => {
    if (router.state.initialized) {
      resolve()
      return
    }
    const unsubscribe = router.subscribe((state) => {
      if (!state.initialized) return
      unsubscribe()
      resolve()
    })
  })
