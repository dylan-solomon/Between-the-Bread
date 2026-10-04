import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resizeImage } from '@/utils/resizeImage'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 2000
  height = 1000
  set src(_value: string) {
    queueMicrotask(() => { this.onload?.() })
  }
}

const mockDrawImage = vi.fn()
const mockToBlob = vi.fn((callback: (blob: Blob | null) => void) => {
  callback(new Blob(['fake'], { type: 'image/jpeg' }))
})

beforeEach(() => {
  vi.stubGlobal('Image', MockImage)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: mockDrawImage,
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(mockToBlob as unknown as HTMLCanvasElement['toBlob'])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const makeFile = (): File => new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })

describe('resizeImage', () => {
  it('scales the canvas down to maxWidth when the image is wider', async () => {
    const blob = await resizeImage(makeFile(), 1200)
    expect(blob).toBeInstanceOf(Blob)
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 600)
  })

  it('keeps the original format by default', async () => {
    await resizeImage(makeFile(), 1200)

    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', undefined)
  })

  it('can save in another format at a chosen quality', async () => {
    await resizeImage(makeFile(), 1600, { type: 'image/webp', quality: 0.85 })

    expect(mockToBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.85)
  })

  it('keeps the original size when the image is already narrower than maxWidth', async () => {
    vi.stubGlobal('Image', class extends MockImage {
      width = 800
      height = 400
    })

    await resizeImage(makeFile(), 1200)
    expect(mockDrawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 400)
  })

  it('rejects when canvas 2D context is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(resizeImage(makeFile(), 1200)).rejects.toThrow()
  })

  it('rejects when the image fails to load', async () => {
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => { this.onerror?.() })
      }
    })

    await expect(resizeImage(makeFile(), 1200)).rejects.toThrow()
  })

  it('rejects when toBlob produces no blob', async () => {
    mockToBlob.mockImplementationOnce((callback: (blob: Blob | null) => void) => { callback(null) })
    await expect(resizeImage(makeFile(), 1200)).rejects.toThrow()
  })
})
