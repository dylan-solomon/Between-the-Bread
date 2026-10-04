import { createClient } from '@supabase/supabase-js'
import { fixImages } from './fixImages'
import type { Bucket, Deps, StoredObject } from './fixImages'
import { shrinkImage } from './shrink'

const BUCKETS: Bucket[] = ['sandwich-images', 'blog-images']
const PAGE_SIZE = 100
const ONE_YEAR_SECONDS = '31536000'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apply = process.argv.includes('--apply')
const deleteOriginals = process.argv.includes('--delete-originals')

if (!url || !serviceKey) {
  console.log('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local to fix images.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const sizeOf = (metadata: unknown): number =>
  typeof metadata === 'object' && metadata !== null && 'size' in metadata && typeof metadata.size === 'number' ? metadata.size : 0

const listBucket = async (bucket: Bucket, offset = 0): Promise<StoredObject[]> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })
  if (error !== null) throw new Error(`Could not list ${bucket}: ${error.message}`)
  const files = data
    .filter((item) => /\.(jpe?g|png|webp)$/i.test(item.name))
    .map((item) => ({
      bucket,
      path: item.name,
      size: sizeOf(item.metadata),
      publicUrl: supabase.storage.from(bucket).getPublicUrl(item.name).data.publicUrl,
    }))
  return data.length < PAGE_SIZE ? files : [...files, ...(await listBucket(bucket, offset + PAGE_SIZE))]
}

const failOn = (error: { message: string } | null, action: string): void => {
  if (error !== null) throw new Error(`${action}: ${error.message}`)
}

const deps: Deps = {
  listObjects: async () => (await Promise.all(BUCKETS.map((bucket) => listBucket(bucket)))).flat(),
  loadReferences: async () => {
    const [sandwiches, posts] = await Promise.all([
      supabase.from('sandwich_database').select('id, image_url'),
      supabase.from('blog_posts').select('id, cover_image_url, body'),
    ])
    failOn(sandwiches.error, 'Could not read encyclopedia entries')
    failOn(posts.error, 'Could not read blog posts')
    return {
      sandwiches: (sandwiches.data ?? []) as { id: string; image_url: string | null }[],
      posts: (posts.data ?? []) as { id: string; cover_image_url: string | null; body: string }[],
    }
  },
  download: async (stored) => {
    const { data, error } = await supabase.storage.from(stored.bucket).download(stored.path)
    failOn(error, 'Download failed')
    if (data === null) throw new Error('Download returned nothing')
    return Buffer.from(await data.arrayBuffer())
  },
  convert: shrinkImage,
  upload: async (bucket, path, image) => {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, image, { contentType: 'image/webp', cacheControl: ONE_YEAR_SECONDS, upsert: true })
    failOn(error, 'Upload failed')
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  },
  updateSandwichImage: async (id, newUrl) => {
    const { error } = await supabase.from('sandwich_database').update({ image_url: newUrl }).eq('id', id)
    failOn(error, 'Could not update the encyclopedia entry')
  },
  updatePost: async (id, changes) => {
    const { error } = await supabase.from('blog_posts').update(changes).eq('id', id)
    failOn(error, 'Could not update the blog post')
  },
  remove: async (bucket, path) => {
    const { error } = await supabase.storage.from(bucket).remove([path])
    failOn(error, 'Could not delete the original')
  },
  log: (line) => { console.log(line) },
}

const main = async (): Promise<void> => {
  console.log(apply ? 'Fixing images.' : 'Dry run: nothing will change. Add --apply to make these changes.')
  const summary = await fixImages({ deps, apply, deleteOriginals })
  console.log(
    [
      `To shrink: ${String(summary.toConvert)}`,
      `shrunk: ${String(summary.converted)}`,
      `failed: ${String(summary.failed)}`,
      `already small: ${String(summary.alreadySmall)}`,
      `not used: ${String(summary.unused)}`,
      `originals deleted: ${String(summary.deleted)}`,
    ].join(', '),
  )
  if (summary.failed > 0) process.exitCode = 1
}

void main()
