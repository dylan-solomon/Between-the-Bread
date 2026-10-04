import { useState } from 'react'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { capturePhotoUploaded } from '@/analytics/events'
import { messageFor } from '@/api/errors'
import { registerPhoto } from '@/api/sandwichPage'
import type { Photo, TargetType } from '@/api/sandwichPage'
import { resizeImage } from '@/utils/resizeImage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_WIDTH = 1200
const MAX_CAPTION_LENGTH = 100
const BUCKET = 'user-photos'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type Props = {
  targetType: TargetType
  slug: string
  targetId: string
  onUploaded: (photo: Photo) => void
}

export default function PhotoUpload({ targetType, slug, targetId, onUploaded }: Props) {
  const { user, session } = useAuth()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null)
  const [contentType, setContentType] = useState<string>('image/jpeg')
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setResizedBlob(null)
    setCaption('')
  }

  const handleFileChange = async (file: File | undefined) => {
    if (file === undefined) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, or WebP image.')
      return
    }

    try {
      const blob = await resizeImage(file, MAX_WIDTH)
      setResizedBlob(blob)
      setContentType(file.type)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      toast.error('Failed to process image. Please try another photo.')
    }
  }

  const handleUpload = async () => {
    if (resizedBlob === null || user === null || session === null) return

    setUploading(true)
    try {
      const extension = EXTENSIONS[contentType] ?? 'jpg'
      const path = `${user.id}/${nanoid()}.${extension}`

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, resizedBlob, { contentType })
      if (uploadError !== null) {
        toast.error('Failed to upload photo. Please try again.')
        return
      }

      const photo = await registerPhoto(session.access_token, {
        targetType,
        slug,
        targetId,
        storagePath: path,
        caption: caption.trim() === '' ? undefined : caption.trim(),
      })
      onUploaded(photo)
      capturePhotoUploaded({ targetType, slug })
      toast.success('Photo submitted for review!')
      reset()
    } catch (error) {
      toast.error(messageFor(error, 'Failed to upload photo. Please try again.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="inline-block cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
        Choose photo
        <input
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="sr-only"
          aria-label="Choose photo"
          onChange={(e) => { void handleFileChange(e.target.files?.[0]) }}
        />
      </label>

      {previewUrl !== null && (
        <div className="mt-3 space-y-2">
          <img src={previewUrl} alt="Preview" className="max-h-48 rounded-md object-cover" />

          <label className="block text-sm text-neutral-700">
            Caption (optional)
            <input
              type="text"
              aria-label="Caption"
              value={caption}
              maxLength={MAX_CAPTION_LENGTH}
              onChange={(e) => { setCaption(e.target.value) }}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => { void handleUpload() }}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
