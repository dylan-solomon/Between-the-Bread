import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { buildEntries } from './encyclopedia/buildEntries'
import { makeIngredientLookup } from './encyclopedia/ingredientCell'
import { toSql } from './encyclopedia/toSql'
import type { IngredientCategory, Note, SheetColumn, SheetRow } from './encyclopedia/types'

const USAGE = 'Usage: pnpm import:encyclopedia <spreadsheet.xlsx> [--name wave-1] [--update]'
const OUTPUT_DIR = resolve(import.meta.dirname, '../supabase/seeds/encyclopedia')
const INGREDIENTS_PATH = resolve(import.meta.dirname, '../src/data/ingredients.json')
const CATEGORIES: IngredientCategory[] = ['bread', 'protein', 'cheese', 'toppings', 'condiments']

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

const readIngredientNames = (): Record<IngredientCategory, string[]> => {
  const data = JSON.parse(readFileSync(INGREDIENTS_PATH, 'utf8')) as { ingredients: Record<string, { name: string }[]> }
  return Object.fromEntries(CATEGORIES.map((category) => [category, (data.ingredients[category] ?? []).map((i) => i.name)])) as Record<
    IngredientCategory,
    string[]
  >
}

const readRows = async (path: string): Promise<SheetRow[]> => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.worksheets.find((candidate) => {
    const headers = candidate.getRow(1).values
    return Array.isArray(headers) && headers.includes('Sandwich')
  })
  if (sheet === undefined) return fail('No sheet with a "Sandwich" column was found in the first row.')

  const headers = (sheet.getRow(1).values as (string | undefined)[]).map((value) => value?.trim())
  const rows: SheetRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const record: Record<string, string | null> = {}
    headers.forEach((header, column) => {
      if (header === undefined || header === '') return
      const text = row.getCell(column).text.trim()
      record[header] = text === '' ? null : text
    })
    rows.push(record as Partial<Record<SheetColumn, string | null>>)
  })
  return rows
}

const printNotes = (notes: Note[]): void => {
  if (notes.length === 0) return
  console.log('\nIngredients left out of the entries (not matched to the site):')
  notes.forEach((note) => { console.log(`  ${note.sandwich} / ${note.category}: ${note.text} (${note.reason})`) })
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const input = args.find((arg) => !arg.startsWith('--') && arg !== args[args.indexOf('--name') + 1])
  if (input === undefined) return fail(USAGE)

  const nameIndex = args.indexOf('--name')
  const name = nameIndex >= 0 ? (args[nameIndex + 1] ?? '') : basename(input, extname(input))
  if (name === '') return fail(USAGE)
  const update = args.includes('--update')

  const rows = await readRows(resolve(input))
  const { entries, problems, notes } = buildEntries(rows, { lookup: makeIngredientLookup(readIngredientNames()) })

  if (problems.length > 0) {
    console.error('The spreadsheet has problems. Nothing was written.\n')
    problems.forEach((problem) => { console.error(`  ${problem.sandwich}: ${problem.message}`) })
    process.exit(1)
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(resolve(OUTPUT_DIR, `${name}.json`), `${JSON.stringify(entries, null, 2)}\n`)
  writeFileSync(resolve(OUTPUT_DIR, `${name}.sql`), toSql(entries, { update, source: name }))

  console.log(`${String(entries.length)} entries written to supabase/seeds/encyclopedia/${name}.sql (${update ? 'refreshes existing entries' : 'skips entries that already exist'}).`)
  entries.forEach((entry) => { console.log(`  ${entry.slug}`) })
  printNotes(notes)
}

void main()
