import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { shrinkImage } from '../shrink'

const picture = (width: number, height: number, format: 'png' | 'jpeg' = 'png'): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })[format]().toBuffer()

describe('shrinkImage', () => {
  it('scales a wide picture down to 1600px wide as WebP, keeping its shape', async () => {
    const result = await sharp(await shrinkImage(await picture(3200, 1600))).metadata()

    expect(result).toMatchObject({ format: 'webp', width: 1600, height: 800 })
  })

  it('does not enlarge a picture that is already narrow', async () => {
    const result = await sharp(await shrinkImage(await picture(800, 600, 'jpeg'))).metadata()

    expect(result).toMatchObject({ format: 'webp', width: 800, height: 600 })
  })

  it('turns a sideways phone photo the right way up', async () => {
    const sideways = await sharp(await picture(1000, 500, 'jpeg')).withMetadata({ orientation: 6 }).jpeg().toBuffer()

    const result = await sharp(await shrinkImage(sideways)).metadata()

    expect(result).toMatchObject({ width: 500, height: 1000 })
  })

  it('fails on something that is not a picture', async () => {
    await expect(shrinkImage(Buffer.from('not an image'))).rejects.toThrow()
  })
})
