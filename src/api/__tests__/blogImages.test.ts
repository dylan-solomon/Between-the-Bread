import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUpload, mockGetPublicUrl, mockFrom } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: mockFrom } } }))
vi.mock('nanoid', () => ({ nanoid: () => 'abc123' }))

import { uploadBlogImage } from '@/api/blogImages'

const makeFile = (overrides: { name?: string; type?: string; size?: number } = {}): File => {
  const file = new File(['x'], overrides.name ?? 'photo.png', { type: overrides.type ?? 'image/png' })
  Object.defineProperty(file, 'size', { value: overrides.size ?? 1024 })
  return file
}

beforeEach(() => {
  vi.resetAllMocks()
  mockFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl })
  mockUpload.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/blog-images/abc123.png' } })
})

describe('uploadBlogImage', () => {
  it('uploads to the blog-images bucket and returns the public URL', async () => {
    const file = makeFile()

    const url = await uploadBlogImage(file)

    expect(mockFrom).toHaveBeenCalledWith('blog-images')
    expect(mockUpload).toHaveBeenCalledWith('abc123.png', file, { contentType: 'image/png', cacheControl: '31536000' })
    expect(mockGetPublicUrl).toHaveBeenCalledWith('abc123.png')
    expect(url).toBe('https://cdn.example.com/blog-images/abc123.png')
  })

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('names a %s upload with the .%s extension', async (type, extension) => {
    await uploadBlogImage(makeFile({ type }))

    expect(mockUpload.mock.calls[0][0]).toBe(`abc123.${extension}`)
  })

  it('refuses a file that is not a JPEG, PNG or WebP image', async () => {
    await expect(uploadBlogImage(makeFile({ name: 'a.gif', type: 'image/gif' }))).rejects.toThrow(
      'Please choose a JPEG, PNG, or WebP image.',
    )
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('refuses a file over 5MB', async () => {
    await expect(uploadBlogImage(makeFile({ size: 5 * 1024 * 1024 + 1 }))).rejects.toThrow('Images must be 5MB or smaller.')
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('accepts a file of exactly 5MB', async () => {
    await expect(uploadBlogImage(makeFile({ size: 5 * 1024 * 1024 }))).resolves.toBeTypeOf('string')
  })

  it('fails with a clear message when the upload is rejected', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'policy' } })

    await expect(uploadBlogImage(makeFile())).rejects.toThrow('Failed to upload image. Please try again.')
  })
})
