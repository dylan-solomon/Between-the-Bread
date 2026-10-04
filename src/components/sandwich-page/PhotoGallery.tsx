import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useAuthPrompt } from '@/context/AuthPromptContext'
import { fetchPhotos } from '@/api/sandwichPage'
import type { Photo, TargetType } from '@/api/sandwichPage'
import PhotoUpload from '@/components/sandwich-page/PhotoUpload'

type Props = {
  targetType: TargetType
  slug: string
  targetId: string
}

export default function PhotoGallery({ targetType, slug, targetId }: Props) {
  const { user } = useAuth()
  const { prompt } = useAuthPrompt()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchPhotos({ targetType, slug, targetId })
      .then((result) => { if (active) setPhotos(result.data) })
      .catch(() => { toast.error('Failed to load photos.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [targetType, slug, targetId])

  const handleUploadClick = () => {
    if (user === null) {
      prompt('upload a photo')
      return
    }
    setShowUpload(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-neutral-900">Photos</h2>
        <button
          type="button"
          onClick={handleUploadClick}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Upload photo
        </button>
      </div>

      {showUpload && (
        <div className="mt-3">
          <PhotoUpload
            targetType={targetType}
            slug={slug}
            targetId={targetId}
            onUploaded={() => { setShowUpload(false) }}
          />
        </div>
      )}

      {loading && (
        <p className="mt-6 text-sm text-neutral-500">Loading photos...</p>
      )}

      {!loading && photos.length === 0 && (
        <p className="mt-6 text-center text-sm text-neutral-500">No photos yet — be the first to share one!</p>
      )}

      {!loading && photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => { setLightboxPhoto(photo) }}
              className="aspect-square overflow-hidden rounded-md"
            >
              {photo.signed_url !== null && (
                <img
                  src={photo.signed_url}
                  alt={photo.caption ?? ''}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {lightboxPhoto !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => { setLightboxPhoto(null) }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => { setLightboxPhoto(null) }}
            className="absolute right-4 top-4 text-white"
          >
            <X size={24} />
          </button>
          {lightboxPhoto.signed_url !== null && (
            <img
              src={lightboxPhoto.signed_url}
              alt={lightboxPhoto.caption ?? ''}
              className="max-h-full max-w-full rounded-md object-contain"
              onClick={(e) => { e.stopPropagation() }}
            />
          )}
        </div>
      )}
    </div>
  )
}
