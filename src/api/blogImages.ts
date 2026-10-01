import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase'

const BUCKET = 'blog-images'
const MAX_BYTES = 5 * 1024 * 1024
const ONE_YEAR_SECONDS = '31536000'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const BLOG_IMAGE_TYPES = Object.keys(EXTENSIONS)

export const uploadBlogImage = async (file: File): Promise<string> => {
  const extension = EXTENSIONS[file.type] as string | undefined
  if (extension === undefined) throw new Error('Please choose a JPEG, PNG, or WebP image.')
  if (file.size > MAX_BYTES) throw new Error('Images must be 5MB or smaller.')

  const path = `${nanoid()}.${extension}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: ONE_YEAR_SECONDS })
  if (error !== null) throw new Error('Failed to upload image. Please try again.')

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
