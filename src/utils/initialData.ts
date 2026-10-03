export const INITIAL_DATA_ID = 'initial-data'

type Options<T> = {
  path: string
  isData: (value: unknown) => value is T
}

const parse = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const isWrapper = (value: unknown): value is { path: string; data: unknown } =>
  typeof value === 'object' && value !== null && 'path' in value && typeof value.path === 'string' && 'data' in value

export const readInitialData = <T>({ path, isData }: Options<T>): T | undefined => {
  const wrapper = parse(document.getElementById(INITIAL_DATA_ID)?.textContent ?? '')
  if (!isWrapper(wrapper) || wrapper.path !== path) return undefined
  return isData(wrapper.data) ? wrapper.data : undefined
}
