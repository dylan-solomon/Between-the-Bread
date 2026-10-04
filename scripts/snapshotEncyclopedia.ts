import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseEntries } from './encyclopedia/seed'

const OUTPUT = resolve(import.meta.dirname, '../supabase/seeds/encyclopedia/live.json')
const COLUMNS =
  'name, slug, alternative_names, description, history, origin_country, origin_region, canonical_ingredients, dietary_tags, image_url, published'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.log('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local to save the encyclopedia.')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const { data, error } = await createClient(url, serviceKey).from('sandwich_database').select(COLUMNS).order('slug')
  if (error !== null) throw new Error(`Could not read the encyclopedia: ${error.message}`)

  const { entries, problems } = parseEntries(data, 'the live encyclopedia')
  if (problems.length > 0) {
    console.error('Some entries could not be read. Nothing was written.\n')
    problems.forEach((problem) => { console.error(`  ${problem}`) })
    process.exit(1)
  }

  writeFileSync(OUTPUT, `${JSON.stringify(entries, null, 2)}\n`)
  const published = entries.filter((entry) => entry.published).length
  console.log(`Saved ${String(entries.length)} entries (${String(published)} published) to supabase/seeds/encyclopedia/live.json.`)
  console.log('Next: pnpm seed:encyclopedia to rebuild all.sql.')
}

void main()
