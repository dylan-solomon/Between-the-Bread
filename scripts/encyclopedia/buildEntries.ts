import { DIETARY_TAGS } from '../../src/data/dietaryTags'
import { REGIONS } from '../../src/data/regions'
import { parseIngredientCell } from './ingredientCell'
import type { IngredientLookup } from './ingredientCell'
import type { CanonicalIngredients, EncyclopediaEntry, IngredientCategory, Note, Problem, SheetColumn, SheetRow } from './types'

const CATEGORY_COLUMNS: [SheetColumn, IngredientCategory][] = [
  ['Bread', 'bread'],
  ['Protein', 'protein'],
  ['Cheese', 'cheese'],
  ['Toppings', 'toppings'],
  ['Condiments', 'condiments'],
]

export const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const clean = (value: string | null | undefined): string => (value ?? '').replace(/\r\n/g, '\n').trim()

const tagByLabel = new Map(
  DIETARY_TAGS.flatMap(({ tag, label }) => [
    [label.toLowerCase(), tag] as const,
    [tag, tag] as const,
  ]),
)

const splitList = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== ''),
  ),
]

const isEmptyRow = (row: SheetRow): boolean => Object.values(row).every((value) => clean(value) === '')

type Result = { entries: EncyclopediaEntry[]; problems: Problem[]; notes: Note[] }

export const buildEntries = (rows: SheetRow[], options: { lookup: IngredientLookup }): Result => {
  const entries: EncyclopediaEntry[] = []
  const problems: Problem[] = []
  const notes: Note[] = []
  const slugs = new Set<string>()

  rows.forEach((row, index) => {
    if (isEmptyRow(row)) return

    const name = clean(row.Sandwich)
    const label = name === '' ? `(unnamed row ${String(index + 1)})` : name
    const found: string[] = []

    if (name === '') found.push('Missing sandwich name.')

    const description = clean(row['Short Description'])
    if (description === '') found.push('Missing short description.')

    const history = clean(row.History)
    if (history === '') found.push('Missing history.')

    const region = clean(row.Region)
    if (region === '') found.push('Missing region.')
    else if (!(REGIONS as readonly string[]).includes(region)) {
      found.push(`Region "${region}" is not a site region (${REGIONS.join(', ')}).`)
    }

    const tagText = clean(row['Dietary Tags'])
    const tagLabels = tagText === '' || tagText.toLowerCase() === 'none' ? [] : splitList(tagText)
    const tags = tagLabels.map((tagLabel) => tagByLabel.get(tagLabel.toLowerCase()))
    tagLabels.forEach((tagLabel, i) => {
      if (tags[i] === undefined) found.push(`Dietary tag "${tagLabel}" is not supported.`)
    })

    const slug = slugify(name)
    if (name !== '' && slugs.has(slug)) found.push(`Another sandwich has the same slug "${slug}".`)

    const canonical: CanonicalIngredients = {}
    for (const [column, category] of CATEGORY_COLUMNS) {
      const parsed = parseIngredientCell({ text: row[column], category, lookup: options.lookup })
      if (parsed.names.length > 0) canonical[category] = parsed.names.map((ingredient) => ({ name: ingredient }))
      parsed.skipped.forEach((skip) => { notes.push({ sandwich: label, category, text: skip.text, reason: skip.reason }) })
    }

    if (found.length > 0) {
      found.forEach((message) => { problems.push({ sandwich: label, message }) })
      return
    }

    slugs.add(slug)
    entries.push({
      name,
      slug,
      alternative_names: splitList(clean(row['Alternative Names'])),
      description,
      history,
      origin_country: clean(row.Country) === '' ? null : clean(row.Country),
      origin_region: region,
      canonical_ingredients: canonical,
      dietary_tags: tags.filter((tag): tag is NonNullable<typeof tag> => tag !== undefined),
      image_url: null,
      published: false,
      source: { wave: clean(row.Wave) === '' ? null : clean(row.Wave), wikipedia: clean(row['Wikipedia Article']) === '' ? null : clean(row['Wikipedia Article']) },
    })
  })

  return { entries, problems, notes }
}
