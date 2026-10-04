import { toSql } from './toSql'
import type { CanonicalIngredients, EncyclopediaEntry } from './types'

const SNAPSHOT_FILE = 'live.json'

type Parsed = { entries: EncyclopediaEntry[]; problems: string[] }
type Field<T> = { ok: true; value: T } | { ok: false }

const ok = <T>(value: T): Field<T> => ({ ok: true, value })
const bad: Field<never> = { ok: false }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isIngredientList = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.name === 'string')

const text = (value: unknown): Field<string> => (typeof value === 'string' ? ok(value) : bad)
const slug = (value: unknown): Field<string> => (typeof value === 'string' && /^[a-z0-9-]+$/.test(value) ? ok(value) : bad)
const optionalText = (value: unknown): Field<string | null> =>
  typeof value === 'string' || value === null || value === undefined ? ok(value ?? null) : bad
const textOrEmpty = (value: unknown): Field<string> =>
  typeof value === 'string' ? ok(value) : value === null || value === undefined ? ok('') : bad
const stringList = (value: unknown): Field<string[]> => (isStringList(value) ? ok(value) : value === null ? ok([]) : bad)
const flag = (value: unknown): Field<boolean> => (typeof value === 'boolean' ? ok(value) : bad)
const ingredients = (value: unknown): Field<CanonicalIngredients> =>
  isRecord(value) && Object.values(value).every(isIngredientList) ? ok(value) : bad

const labelOf = (raw: Record<string, unknown>): string =>
  typeof raw.slug === 'string' ? raw.slug : typeof raw.name === 'string' ? raw.name : '?'

const readEntry = (raw: Record<string, unknown>): EncyclopediaEntry | { field: string } => {
  const name = text(raw.name)
  if (!name.ok) return { field: 'name' }
  const entrySlug = slug(raw.slug)
  if (!entrySlug.ok) return { field: 'slug' }
  const alternativeNames = stringList(raw.alternative_names)
  if (!alternativeNames.ok) return { field: 'alternative_names' }
  const description = textOrEmpty(raw.description)
  if (!description.ok) return { field: 'description' }
  const history = textOrEmpty(raw.history)
  if (!history.ok) return { field: 'history' }
  const country = optionalText(raw.origin_country)
  if (!country.ok) return { field: 'origin_country' }
  const region = optionalText(raw.origin_region)
  if (!region.ok) return { field: 'origin_region' }
  const canonical = ingredients(raw.canonical_ingredients)
  if (!canonical.ok) return { field: 'canonical_ingredients' }
  const tags = stringList(raw.dietary_tags)
  if (!tags.ok) return { field: 'dietary_tags' }
  const image = optionalText(raw.image_url)
  if (!image.ok) return { field: 'image_url' }
  const published = flag(raw.published)
  if (!published.ok) return { field: 'published' }
  return {
    name: name.value,
    slug: entrySlug.value,
    alternative_names: alternativeNames.value,
    description: description.value,
    history: history.value,
    origin_country: country.value,
    origin_region: region.value,
    canonical_ingredients: canonical.value,
    dietary_tags: tags.value,
    image_url: image.value,
    published: published.value,
  }
}

export const parseEntries = (data: unknown, file: string): Parsed => {
  if (!Array.isArray(data)) return { entries: [], problems: [`${file} is not a list of entries`] }
  return data.reduce<Parsed>(
    (parsed, raw: unknown, index) => {
      const entry = isRecord(raw) ? readEntry(raw) : { field: 'shape' }
      if ('slug' in entry) return { ...parsed, entries: [...parsed.entries, entry] }
      const label = isRecord(raw) ? labelOf(raw) : '?'
      return { ...parsed, problems: [...parsed.problems, `${file} entry ${String(index + 1)} (${label}) is missing or has a wrong ${entry.field}`] }
    },
    { entries: [], problems: [] },
  )
}

const waveNumber = (file: string): number => Number(/^wave-(\d+)\.json$/.exec(file)?.[1] ?? Number.POSITIVE_INFINITY)

export const orderSeedFiles = (files: string[]): string[] =>
  files
    .filter((file) => file.endsWith('.json'))
    .toSorted((a, b) => {
      if (a === SNAPSHOT_FILE || b === SNAPSHOT_FILE) return a === SNAPSHOT_FILE ? 1 : -1
      return waveNumber(a) - waveNumber(b) || a.localeCompare(b)
    })

const mergeBySlug = (entries: EncyclopediaEntry[]): EncyclopediaEntry[] => {
  const latest = new Map(entries.map((entry) => [entry.slug, entry]))
  return [...new Set(entries.map((entry) => entry.slug))].flatMap((key) => {
    const entry = latest.get(key)
    return entry === undefined ? [] : [entry]
  })
}

export const buildSeed = (
  sources: { file: string; data: unknown }[],
  options: { update?: boolean },
): Parsed & { sql: string } => {
  const parsed = sources.map(({ file, data }) => parseEntries(data, file))
  const entries = mergeBySlug(parsed.flatMap((result) => result.entries))
  const source = sources.map(({ file }) => file.replace(/\.json$/, '')).join(', ')
  return {
    entries,
    problems: parsed.flatMap((result) => result.problems),
    sql: toSql(entries, { update: options.update, source }),
  }
}
