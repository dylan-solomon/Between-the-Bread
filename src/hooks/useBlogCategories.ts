import { useCallback, useEffect, useState } from 'react'
import { fetchPublicBlogCategories } from '@/api/blog'
import type { BlogCategory } from '@/api/blog'

type Status = 'loading' | 'ready' | 'error'

type UseBlogCategoriesResult = {
  status: Status
  categories: BlogCategory[]
  retry: () => void
}

export const useBlogCategories = (initial?: BlogCategory[]): UseBlogCategoriesResult => {
  const [status, setStatus] = useState<Status>(initial === undefined ? 'loading' : 'ready')
  const [categories, setCategories] = useState<BlogCategory[]>(initial ?? [])
  const [attempt, setAttempt] = useState(0)
  const [sent] = useState(initial)

  useEffect(() => {
    if (sent !== undefined && attempt === 0) return
    let cancelled = false
    setStatus('loading')
    fetchPublicBlogCategories()
      .then((loaded) => {
        if (cancelled) return
        setCategories(loaded)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [sent, attempt])

  const retry = useCallback(() => { setAttempt((prev) => prev + 1) }, [])

  return { status, categories, retry }
}
