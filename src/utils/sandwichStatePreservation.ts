import type { SandwichComposition, DoubleCategory } from '@/types'
import type { BaseCategory } from '@/engine/randomizer'

const STORAGE_KEY = 'btb_preserved_sandwich'

type PreservedSandwichState = {
  composition: SandwichComposition
  name: string
  lockedCategories: BaseCategory[]
  doubleCategories: DoubleCategory[]
}

export const saveSandwichState = (state: PreservedSandwichState): void => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const restoreSandwichState = (): PreservedSandwichState | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('composition' in parsed) ||
      !('name' in parsed)
    ) {
      return null
    }
    return parsed as PreservedSandwichState
  } catch {
    return null
  }
}

export const clearSandwichState = (): void => {
  sessionStorage.removeItem(STORAGE_KEY)
}
