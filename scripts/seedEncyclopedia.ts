import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSeed, orderSeedFiles } from './encyclopedia/seed'

const SEED_DIR = resolve(import.meta.dirname, '../supabase/seeds/encyclopedia')
const OUTPUT = 'all.sql'
const update = process.argv.includes('--update')

const files = orderSeedFiles(readdirSync(SEED_DIR))
const sources = files.map((file) => ({ file, data: JSON.parse(readFileSync(resolve(SEED_DIR, file), 'utf8')) as unknown }))
const { entries, problems, sql } = buildSeed(sources, { update })

if (problems.length > 0) {
  console.error('Some entries could not be read. Nothing was written.\n')
  problems.forEach((problem) => { console.error(`  ${problem}`) })
  process.exit(1)
}

writeFileSync(resolve(SEED_DIR, OUTPUT), sql)

const published = entries.filter((entry) => entry.published).length
console.log(`Built supabase/seeds/encyclopedia/${OUTPUT} from ${files.join(', ')}.`)
console.log(`${String(entries.length)} entries (${String(published)} published, ${String(entries.length - published)} unpublished).`)
console.log(update ? 'Running it refreshes the written content of entries that already exist.' : 'Running it adds missing entries and leaves existing ones untouched.')
if (!files.includes('live.json')) console.log('No live snapshot found, so entries use their imported content. Run pnpm encyclopedia:snapshot first to include edits, photos and publishing.')
