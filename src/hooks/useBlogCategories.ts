import { useCallback, useEffect, useState } from 'react'
import { fetchPublicBlogCategories } from '@/api/blog'
import type { BlogCategory } from '@/api/blog'

type Status = 'loading' | 'ready' | 'error'

type UseBlogCategoriesResult = {
  status: Status
  categories: BlogCategory[]
  retry: () => void
}

export const useBlogCategories = (): UseBlogCategoriesResult => {
  const [status, setStatus] = useState<Status>('loading')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
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
  }, [attempt])

  const retry = useCallback(() => { setAttempt((prev) => prev + 1) }, [])

  return { status, categories, retry }
}
