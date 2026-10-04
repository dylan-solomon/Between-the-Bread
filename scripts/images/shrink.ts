import sharp from 'sharp'

const MAX_WIDTH = 1600
const QUALITY = 85

export const shrinkImage = (image: Buffer): Promise<Buffer> =>
  sharp(image).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
