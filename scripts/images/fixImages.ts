export type Bucket = 'sandwich-images' | 'blog-images'

export type StoredObject = { bucket: Bucket; path: string; size: number; publicUrl: string }

export type References = {
  sandwiches: { id: string; image_url: string | null }[]
  posts: { id: string; cover_image_url: string | null; body: string }[]
}

export type Deps = {
  listObjects: () => Promise<StoredObject[]>
  loadReferences: () => Promise<References>
  download: (stored: StoredObject) => Promise<Buffer>
  convert: (image: Buffer) => Promise<Buffer>
  upload: (bucket: Bucket, path: string, image: Buffer) => Promise<string>
  updateSandwichImage: (id: string, url: string) => Promise<void>
  updatePost: (id: string, changes: { cover_image_url?: string; body?: string }) => Promise<void>
  remove: (bucket: Bucket, path: string) => Promise<void>
  log: (line: string) => void
}

export type Summary = {
  toConvert: number
  converted: number
  failed: number
  alreadySmall: number
  unused: number
  deleted: number
}

type Usage = { sandwiches: string[]; covers: string[]; bodies: string[] }

type Progress = { summary: Summary; bodies: ReadonlyMap<string, string> }

const MB = 1024 * 1024
const SMALL_ENOUGH_BYTES = 1.5 * MB
const COPY_SUFFIX = '-1600.webp'

export const convertedPath = (path: string): string => `${path.replace(/\.[^.]+$/, '')}${COPY_SUFFIX}`

const isShrunkCopy = (stored: StoredObject): boolean => stored.path.endsWith(COPY_SUFFIX)

const isSmallWebp = (stored: StoredObject): boolean => stored.path.endsWith('.webp') && stored.size <= SMALL_ENOUGH_BYTES

const label = (stored: StoredObject): string => `${stored.bucket}/${stored.path}`

const megabytes = (bytes: number): string => `${(bytes / MB).toFixed(1)} MB`

const plural = (count: number, one: string, many: string): string => `${String(count)} ${count === 1 ? one : many}`

const usageOf = (url: string, references: References, bodies: ReadonlyMap<string, string>): Usage => ({
  sandwiches: references.sandwiches.filter((row) => row.image_url === url).map((row) => row.id),
  covers: references.posts.filter((post) => post.cover_image_url === url).map((post) => post.id),
  bodies: references.posts.filter((post) => (bodies.get(post.id) ?? post.body).includes(url)).map((post) => post.id),
})

const isUsed = (usage: Usage): boolean => usage.sandwiches.length + usage.covers.length + usage.bodies.length > 0

const describeUsage = (usage: Usage): string =>
  [
    usage.sandwiches.length > 0 ? plural(usage.sandwiches.length, 'encyclopedia entry', 'encyclopedia entries') : null,
    usage.covers.length > 0 ? plural(usage.covers.length, 'blog cover', 'blog covers') : null,
    usage.bodies.length > 0 ? plural(usage.bodies.length, 'blog post', 'blog posts') : null,
  ]
    .filter((part) => part !== null)
    .join(', ')

const bump = (summary: Summary, key: keyof Summary): Summary => ({ ...summary, [key]: summary[key] + 1 })

export const fixImages = async ({
  deps,
  apply,
  deleteOriginals,
}: {
  deps: Deps
  apply: boolean
  deleteOriginals: boolean
}): Promise<Summary> => {
  const [objects, references] = await Promise.all([deps.listObjects(), deps.loadReferences()])
  const paths = new Set(objects.map(label))
  const hasCopy = (stored: StoredObject): boolean => paths.has(`${stored.bucket}/${convertedPath(stored.path)}`)

  const shrink = async (stored: StoredObject, usage: Usage, progress: Progress): Promise<Progress> => {
    try {
      const image = await deps.convert(await deps.download(stored))
      const newPath = convertedPath(stored.path)
      const newUrl = await deps.upload(stored.bucket, newPath, image)
      await Promise.all(usage.sandwiches.map((id) => deps.updateSandwichImage(id, newUrl)))
      await Promise.all(usage.covers.map((id) => deps.updatePost(id, { cover_image_url: newUrl })))
      const newBodies = usage.bodies.map((id) => {
        const current = progress.bodies.get(id) ?? references.posts.find((post) => post.id === id)?.body ?? ''
        return [id, current.replaceAll(stored.publicUrl, newUrl)] as const
      })
      await Promise.all(newBodies.map(([id, body]) => deps.updatePost(id, { body })))
      deps.log(`Shrunk ${label(stored)} (${megabytes(stored.size)}) to ${newPath} (${megabytes(image.length)})`)
      return { summary: bump(progress.summary, 'converted'), bodies: new Map([...progress.bodies, ...newBodies]) }
    } catch (error) {
      deps.log(`Failed ${label(stored)}: ${error instanceof Error ? error.message : String(error)}`)
      return { ...progress, summary: bump(progress.summary, 'failed') }
    }
  }

  const handle = async (progress: Progress, stored: StoredObject): Promise<Progress> => {
    if (isShrunkCopy(stored) || isSmallWebp(stored)) return { ...progress, summary: bump(progress.summary, 'alreadySmall') }

    const usage = usageOf(stored.publicUrl, references, progress.bodies)
    if (!isUsed(usage)) {
      if (!hasCopy(stored)) {
        deps.log(`Not used anywhere: ${label(stored)}`)
        return { ...progress, summary: bump(progress.summary, 'unused') }
      }
      if (!deleteOriginals) return progress
      if (!apply) {
        deps.log(`Would delete original ${label(stored)}`)
        return progress
      }
      await deps.remove(stored.bucket, stored.path)
      deps.log(`Deleted original ${label(stored)}`)
      return { ...progress, summary: bump(progress.summary, 'deleted') }
    }

    const counted = { ...progress, summary: bump(progress.summary, 'toConvert') }
    if (!apply) {
      deps.log(`Would shrink ${label(stored)} (${megabytes(stored.size)}), used by ${describeUsage(usage)}`)
      return counted
    }
    return shrink(stored, usage, counted)
  }

  const start: Progress = {
    summary: { toConvert: 0, converted: 0, failed: 0, alreadySmall: 0, unused: 0, deleted: 0 },
    bodies: new Map(),
  }
  const finished = await objects.reduce<Promise<Progress>>(async (done, stored) => handle(await done, stored), Promise.resolve(start))
  return finished.summary
}
