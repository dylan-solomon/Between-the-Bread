export type PostStatus = 'Draft' | 'Scheduled' | 'Published'

type PostTiming = { published: boolean; published_at: string | null }

export const postStatus = ({ published, published_at }: PostTiming): PostStatus => {
  if (!published) return 'Draft'
  return published_at !== null && new Date(published_at).getTime() > Date.now() ? 'Scheduled' : 'Published'
}

const pad = (value: number): string => String(value).padStart(2, '0')

export const toDateTimeLocal = (iso: string | null): string => {
  if (iso === null) return ''
  const date = new Date(iso)
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const fromDateTimeLocal = (value: string): string | null => {
  if (value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
