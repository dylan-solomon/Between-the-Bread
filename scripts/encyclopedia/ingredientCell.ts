import type { IngredientCategory, SkipReason } from './types'

export type IngredientLookup = (category: IngredientCategory, text: string) => string | undefined

export type Skipped = { text: string; reason: SkipReason }

type ParsedCell = { names: string[]; skipped: Skipped[] }

const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const makeIngredientLookup = (byCategory: Record<IngredientCategory, string[]>): IngredientLookup => {
  const index = new Map(
    (Object.entries(byCategory) as [IngredientCategory, string[]][]).map(([category, names]) => [
      category,
      new Map(names.map((name) => [normalize(name), name])),
    ]),
  )
  return (category, text) => index.get(category)?.get(normalize(text))
}

type Alternative = { text: string; optional: boolean }

const parseAlternative = (raw: string): Alternative => {
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(raw.trim())
  if (match === null) return { text: raw.trim(), optional: false }
  const note = match[2].trim().toLowerCase()
  return { text: match[1].trim(), optional: note !== 'toasted' }
}

const toGroups = (text: string): Alternative[][] => {
  const segments = text.split(',').map((segment) => segment.trim()).filter((segment) => segment !== '')
  const isAlternativeList = segments.slice(1).some((segment) => /^or\s+/i.test(segment))
  if (isAlternativeList) {
    return [segments.map((segment) => parseAlternative(segment.replace(/^or\s+/i, '')))]
  }
  return segments.map((segment) => segment.split(/\s+or\s+/i).map(parseAlternative))
}

export const parseIngredientCell = (input: {
  text: string | null | undefined
  category: IngredientCategory
  lookup: IngredientLookup
}): ParsedCell => {
  const text = input.text?.trim() ?? ''
  if (text === '' || text.toLowerCase() === 'none') return { names: [], skipped: [] }

  const names: string[] = []
  const skipped: Skipped[] = []

  for (const group of toGroups(text)) {
    const required = group.filter((alternative) => !alternative.optional)
    if (required.length === 0) {
      const first = group.at(0)
      if (first !== undefined) skipped.push({ text: first.text, reason: 'optional' })
      continue
    }
    const matched = required
      .map((alternative) => input.lookup(input.category, alternative.text))
      .find((name) => name !== undefined)
    if (matched === undefined) {
      skipped.push({ text: required.at(0)?.text ?? '', reason: 'not on the site' })
      continue
    }
    if (!names.includes(matched)) names.push(matched)
  }

  return { names, skipped }
}
