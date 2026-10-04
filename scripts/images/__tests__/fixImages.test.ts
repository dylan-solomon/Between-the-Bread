import { describe, it, expect, vi } from 'vitest'
import { convertedPath, fixImages } from '../fixImages'
import type { Deps, References, StoredObject } from '../fixImages'

const MB = 1024 * 1024
const BASE = 'https://cdn.example.com/storage/v1/object/public'

const object = (bucket: StoredObject['bucket'], path: string, size: number): StoredObject => ({
  bucket,
  path,
  size,
  publicUrl: `${BASE}/${bucket}/${path}`,
})

const emptyReferences: References = { sandwiches: [], posts: [] }

const makeDeps = (objects: StoredObject[], references: References = emptyReferences, overrides: Partial<Deps> = {}) => {
  const lines: string[] = []
  const deps: Deps = {
    listObjects: vi.fn(() => Promise.resolve(objects)),
    loadReferences: vi.fn(() => Promise.resolve(references)),
    download: vi.fn(() => Promise.resolve(Buffer.from('original'))),
    convert: vi.fn(() => Promise.resolve(Buffer.from('small'))),
    upload: vi.fn((bucket: string, path: string) => Promise.resolve(`${BASE}/${bucket}/${path}`)),
    updateSandwichImage: vi.fn(() => Promise.resolve()),
    updatePost: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    log: (line: string) => { lines.push(line) },
    ...overrides,
  }
  return { deps, lines }
}

const reubenPhoto = object('sandwich-images', 'abc.jpg', 4 * MB)
const usedByReuben: References = { sandwiches: [{ id: 's-1', image_url: reubenPhoto.publicUrl }], posts: [] }

describe('convertedPath', () => {
  it('names the shrunk copy after the original', () => {
    expect(convertedPath('abc.jpg')).toBe('abc-1600.webp')
    expect(convertedPath('big.webp')).toBe('big-1600.webp')
  })
})

describe('fixImages dry run', () => {
  it('only reports what it would do', async () => {
    const { deps, lines } = makeDeps([reubenPhoto], usedByReuben)

    const summary = await fixImages({ deps, apply: false, deleteOriginals: false })

    expect(deps.download).not.toHaveBeenCalled()
    expect(deps.upload).not.toHaveBeenCalled()
    expect(deps.updateSandwichImage).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ toConvert: 1, converted: 0 })
    expect(lines.join('\n')).toContain('Would shrink sandwich-images/abc.jpg (4.0 MB), used by 1 encyclopedia entry')
  })
})

describe('fixImages apply', () => {
  it('shrinks a used image, saves the copy and points the entry at it', async () => {
    const { deps } = makeDeps([reubenPhoto], usedByReuben)

    const summary = await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.download).toHaveBeenCalledWith(reubenPhoto)
    expect(deps.upload).toHaveBeenCalledWith('sandwich-images', 'abc-1600.webp', Buffer.from('small'))
    expect(deps.updateSandwichImage).toHaveBeenCalledWith('s-1', `${BASE}/sandwich-images/abc-1600.webp`)
    expect(deps.remove).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ converted: 1, failed: 0 })
  })

  it('updates blog covers and pictures inside posts', async () => {
    const cover = object('blog-images', 'cover.png', 3 * MB)
    const inline = object('blog-images', 'inline.jpg', 2 * MB)
    const references: References = {
      sandwiches: [],
      posts: [
        {
          id: 'p-1',
          cover_image_url: cover.publicUrl,
          body: `Intro ![one](${inline.publicUrl}) and again ![two](${inline.publicUrl})`,
        },
      ],
    }
    const { deps } = makeDeps([cover, inline], references)

    await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.updatePost).toHaveBeenCalledWith('p-1', { cover_image_url: `${BASE}/blog-images/cover-1600.webp` })
    expect(deps.updatePost).toHaveBeenCalledWith('p-1', {
      body: `Intro ![one](${BASE}/blog-images/inline-1600.webp) and again ![two](${BASE}/blog-images/inline-1600.webp)`,
    })
  })

  it('keeps every replacement when one post contains several pictures', async () => {
    const first = object('blog-images', 'first.jpg', 2 * MB)
    const second = object('blog-images', 'second.jpg', 2 * MB)
    const references: References = {
      sandwiches: [],
      posts: [{ id: 'p-1', cover_image_url: null, body: `![a](${first.publicUrl}) ![b](${second.publicUrl})` }],
    }
    const { deps } = makeDeps([first, second], references)

    await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.updatePost).toHaveBeenLastCalledWith('p-1', {
      body: `![a](${BASE}/blog-images/first-1600.webp) ![b](${BASE}/blog-images/second-1600.webp)`,
    })
  })

  it('leaves small WebP images and shrunk copies alone', async () => {
    const small = object('sandwich-images', 'tiny.webp', 300 * 1024)
    const copy = object('sandwich-images', 'abc-1600.webp', 400 * 1024)
    const { deps } = makeDeps([small, copy], { sandwiches: [{ id: 's-1', image_url: small.publicUrl }], posts: [] })

    const summary = await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.download).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ toConvert: 0, alreadySmall: 2 })
  })

  it('shrinks WebP images that are still large', async () => {
    const big = object('sandwich-images', 'big.webp', 3 * MB)
    const { deps } = makeDeps([big], { sandwiches: [{ id: 's-1', image_url: big.publicUrl }], posts: [] })

    await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.upload).toHaveBeenCalledWith('sandwich-images', 'big-1600.webp', Buffer.from('small'))
  })

  it('skips images nothing on the site uses', async () => {
    const orphan = object('blog-images', 'old.jpg', 2 * MB)
    const { deps, lines } = makeDeps([orphan])

    const summary = await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(deps.download).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ unused: 1 })
    expect(lines.join('\n')).toContain('Not used anywhere: blog-images/old.jpg')
  })

  it('keeps going when one image fails and leaves its references alone', async () => {
    const broken = object('sandwich-images', 'broken.jpg', 2 * MB)
    const references: References = {
      sandwiches: [
        { id: 's-1', image_url: broken.publicUrl },
        { id: 's-2', image_url: reubenPhoto.publicUrl },
      ],
      posts: [],
    }
    const convert = vi.fn((buffer: Buffer) =>
      buffer.toString() === 'bad' ? Promise.reject(new Error('unsupported image')) : Promise.resolve(Buffer.from('small')),
    )
    const download = vi.fn((stored: StoredObject) => Promise.resolve(Buffer.from(stored.path === 'broken.jpg' ? 'bad' : 'good')))
    const { deps, lines } = makeDeps([broken, reubenPhoto], references, { convert, download })

    const summary = await fixImages({ deps, apply: true, deleteOriginals: false })

    expect(summary).toMatchObject({ converted: 1, failed: 1 })
    expect(deps.updateSandwichImage).toHaveBeenCalledTimes(1)
    expect(deps.updateSandwichImage).toHaveBeenCalledWith('s-2', `${BASE}/sandwich-images/abc-1600.webp`)
    expect(lines.join('\n')).toContain('Failed sandwich-images/broken.jpg: unsupported image')
  })
})

describe('fixImages deleting originals', () => {
  it('deletes an original only once nothing uses it and its shrunk copy exists', async () => {
    const original = object('sandwich-images', 'abc.jpg', 4 * MB)
    const copy = object('sandwich-images', 'abc-1600.webp', 400 * 1024)
    const { deps } = makeDeps([original, copy], { sandwiches: [{ id: 's-1', image_url: copy.publicUrl }], posts: [] })

    const summary = await fixImages({ deps, apply: true, deleteOriginals: true })

    expect(deps.remove).toHaveBeenCalledWith('sandwich-images', 'abc.jpg')
    expect(summary).toMatchObject({ deleted: 1 })
  })

  it('never deletes an unused image that has no shrunk copy', async () => {
    const orphan = object('blog-images', 'old.jpg', 2 * MB)
    const { deps } = makeDeps([orphan])

    await fixImages({ deps, apply: true, deleteOriginals: true })

    expect(deps.remove).not.toHaveBeenCalled()
  })

  it('deletes nothing in a dry run', async () => {
    const original = object('sandwich-images', 'abc.jpg', 4 * MB)
    const copy = object('sandwich-images', 'abc-1600.webp', 400 * 1024)
    const { deps, lines } = makeDeps([original, copy], { sandwiches: [{ id: 's-1', image_url: copy.publicUrl }], posts: [] })

    await fixImages({ deps, apply: false, deleteOriginals: true })

    expect(deps.remove).not.toHaveBeenCalled()
    expect(lines.join('\n')).toContain('Would delete original sandwich-images/abc.jpg')
  })
})
