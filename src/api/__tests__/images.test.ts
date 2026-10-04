import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpload, mockGetPublicUrl, mockFrom, mockResize } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockFrom: vi.fn(),
  mockResize: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: mockFrom } } }))
vi.mock('nanoid', () => ({ nanoid: () => 'abc123' }))
vi.mock('@/utils/resizeImage', () => ({ resizeImage: mockResize }))

import { uploadImage } from '@/api/images'

const makeFile = (overrides: { name?: string; type?: string; size?: number } = {}): File => {
  const file = new File(['x'], overrides.name ?? 'photo.png', { type: overrides.type ?? 'image/png' })
  Object.defineProperty(file, 'size', { value: overrides.size ?? 1024 })
  return file
}

const shrunk = (type = 'image/webp', size = 200 * 1024): Blob => {
  const blob = new Blob(['y'], { type })
  Object.defineProperty(blob, 'size', { value: size })
  return blob
}

beforeEach(() => {
  vi.resetAllMocks()
  mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl })
  mockUpload.mockResolvedValue({ error: null })
  mockResize.mockResolvedValue(shrunk())
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/blog-images/abc123.webp' } })
})

describe('uploadImage', () => {
  it('shrinks the image to 1600px wide as WebP and uploads that', async () => {
    const file = makeFile()
    const blob = shrunk()
    mockResize.mockResolvedValue(blob)

    const url = await uploadImage({ bucket: 'blog-images', file })

    expect(mockResize).toHaveBeenCalledWith(file, 1600, { type: 'image/webp', quality: 0.85 })
    expect(mockFrom).toHaveBeenCalledWith('blog-images')
    expect(mockUpload).toHaveBeenCalledWith('abc123.webp', blob, { contentType: 'image/webp', cacheControl: '31536000' })
    expect(url).toBe('https://cdn.example.com/blog-images/abc123.webp')
  })

  it('uploads sandwich photos to the sandwich-images bucket', async () => {
    await uploadImage({ bucket: 'sandwich-images', file: makeFile() })

    expect(mockFrom).toHaveBeenCalledWith('sandwich-images')
  })

  it('keeps the format the browser produced when it cannot make WebP', async () => {
    mockResize.mockResolvedValue(shrunk('image/png'))

    await uploadImage({ bucket: 'blog-images', file: makeFile() })

    expect(mockUpload.mock.calls[0][0]).toBe('abc123.png')
    expect(mockUpload.mock.calls[0][2]).toMatchObject({ contentType: 'image/png' })
  })

  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts a %s image', async (type) => {
    await expect(uploadImage({ bucket: 'blog-images', file: makeFile({ type }) })).resolves.toBeTypeOf('string')
  })

  it('refuses a file that is not a JPEG, PNG or WebP image', async () => {
    await expect(uploadImage({ bucket: 'blog-images', file: makeFile({ name: 'a.gif', type: 'image/gif' }) })).rejects.toThrow(
      'Please choose a JPEG, PNG, or WebP image.',
    )
    expect(mockResize).not.toHaveBeenCalled()
  })

  it('accepts large originals up to 20MB, since they are shrunk first', async () => {
    await expect(uploadImage({ bucket: 'blog-images', file: makeFile({ size: 20 * 1024 * 1024 }) })).resolves.toBeTypeOf('string')
  })

  it('refuses an original over 20MB', async () => {
    await expect(uploadImage({ bucket: 'blog-images', file: makeFile({ size: 20 * 1024 * 1024 + 1 }) })).rejects.toThrow(
      'Images must be 20MB or smaller.',
    )
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('refuses an image that is still over 5MB after shrinking', async () => {
    mockResize.mockResolvedValue(shrunk('image/webp', 5 * 1024 * 1024 + 1))

    await expect(uploadImage({ bucket: 'blog-images', file: makeFile() })).rejects.toThrow(
      'That image is still too large after shrinking. Please try a smaller one.',
    )
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('explains when the image cannot be read', async () => {
    mockResize.mockRejectedValue(new Error('Failed to load image.'))

    await expect(uploadImage({ bucket: 'blog-images', file: makeFile() })).rejects.toThrow(
      "We couldn't read that image. Please try another.",
    )
  })

  it('fails with a clear message when the upload is rejected', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'policy' } })

    await expect(uploadImage({ bucket: 'blog-images', file: makeFile() })).rejects.toThrow('Failed to upload image. Please try again.')
  })
})
