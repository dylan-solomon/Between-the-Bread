import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase'

const MAX_BYTES = 5 * 1024 * 1024
const ONE_YEAR_SECONDS = '31536000'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const IMAGE_TYPES = Object.keys(EXTENSIONS)

export type ImageBucket = 'blog-images' | 'sandwich-images'

export const uploadImage = async ({ bucket, file }: { bucket: ImageBucket; file: File }): Promise<string> => {
  const extension = EXTENSIONS[file.type] as string | undefined
  if (extension === undefined) throw new Error('Please choose a JPEG, PNG, or WebP image.')
  if (file.size > MAX_BYTES) throw new Error('Images must be 5MB or smaller.')

  const path = `${nanoid()}.${extension}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: ONE_YEAR_SECONDS })
  if (error !== null) throw new Error('Failed to upload image. Please try again.')

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
