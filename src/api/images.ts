import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase'
import { resizeImage } from '@/utils/resizeImage'

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const MAX_WIDTH = 1600
const WEBP_QUALITY = 0.85
const ONE_YEAR_SECONDS = '31536000'

const EXTENSIONS: Partial<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const IMAGE_TYPES = Object.keys(EXTENSIONS)

export type ImageBucket = 'blog-images' | 'sandwich-images'

const shrink = async (file: File): Promise<Blob> => {
  try {
    return await resizeImage(file, MAX_WIDTH, { type: 'image/webp', quality: WEBP_QUALITY })
  } catch {
    throw new Error("We couldn't read that image. Please try another.")
  }
}

export const uploadImage = async ({ bucket, file }: { bucket: ImageBucket; file: File }): Promise<string> => {
  if (EXTENSIONS[file.type] === undefined) throw new Error('Please choose a JPEG, PNG, or WebP image.')
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error('Images must be 20MB or smaller.')

  const image = await shrink(file)
  if (image.size > MAX_UPLOAD_BYTES) throw new Error('That image is still too large after shrinking. Please try a smaller one.')

  const extension = EXTENSIONS[image.type] ?? 'webp'
  const path = `${nanoid()}.${extension}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, image, { contentType: image.type, cacheControl: ONE_YEAR_SECONDS })
  if (error !== null) throw new Error('Failed to upload image. Please try again.')

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
