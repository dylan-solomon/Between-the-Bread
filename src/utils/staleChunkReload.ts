const STORAGE_KEY = 'btb_stale_chunk_reload'
const MIN_GAP_MS = 10_000

type Storage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

type Options = {
  target: EventTarget
  storage: Storage
  reload: () => void
  now: () => number
}

const readLastReload = (storage: Storage): number => {
  try {
    return Number(storage.getItem(STORAGE_KEY) ?? 0)
  } catch {
    return 0
  }
}

const rememberReload = (storage: Storage, at: number): void => {
  try {
    storage.setItem(STORAGE_KEY, String(at))
  } catch {
    return
  }
}

export const installStaleChunkReload = ({ target, storage, reload, now }: Options): void => {
  target.addEventListener('vite:preloadError', (event) => {
    const at = now()
    if (at - readLastReload(storage) < MIN_GAP_MS) return
    rememberReload(storage, at)
    event.preventDefault()
    reload()
  })
}
