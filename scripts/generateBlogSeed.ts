import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { parsePost } from './blog/parsePost'
import { toSql } from './blog/toSql'

const POSTS_DIR = resolve(import.meta.dirname, '../supabase/seeds/blog/posts')
const OUTPUT_PATH = resolve(import.meta.dirname, '../supabase/seeds/blog/launch-posts.sql')

const main = (): void => {
  const posts = readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => parsePost(basename(file, '.md'), readFileSync(resolve(POSTS_DIR, file), 'utf8')))

  writeFileSync(OUTPUT_PATH, toSql(posts, { source: 'launch posts' }))
  console.log(`Wrote ${String(posts.length)} posts to ${OUTPUT_PATH}`)
  posts.forEach((post) => { console.log(`  ${post.slug} (${post.category_slugs.join(', ')})`) })
}

main()
