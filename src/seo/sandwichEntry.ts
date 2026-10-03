import type { SandwichEntry } from '../api/database'

export const entryDescription = (entry: SandwichEntry): string =>
  entry.description ?? `The ${entry.name}: its history, origin and ingredients.`
