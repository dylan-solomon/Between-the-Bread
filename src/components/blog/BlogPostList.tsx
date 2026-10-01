import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchBlogPosts } from '@/api/blog'
import type { BlogPostSummary } from '@/api/blog'
import BlogPostCard from '@/components/blog/BlogPostCard'

const PAGE_SIZE = 12

type Status = 'loading' | 'ready' | 'error'

type Props = { category?: string }

export default function BlogPostList({ category }: Props) {
  const [items, setItems] = useState<BlogPostSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [status, setStatus] = useState<Status>('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetchBlogPosts({ category, limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (cancelled) return
        setItems(page.items)
        setTotalCount(page.totalCount)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [category, attempt])

  const loadMore = () => {
    setLoadingMore(true)
    fetchBlogPosts({ category, limit: PAGE_SIZE, offset: items.length })
      .then((page) => {
        setItems((prev) => [...prev, ...page.items])
        setTotalCount(page.totalCount)
      })
      .catch(() => { toast.error('Failed to load more posts.') })
      .finally(() => { setLoadingMore(false) })
  }

  return (
    <div className="mt-8">
      {status === 'loading' && (
        <div role="status" aria-label="Loading posts" className="text-center text-neutral-400">Loading…</div>
      )}

      {status === 'error' && (
        <div role="alert" className="text-center text-neutral-600">
          <p>Something went wrong loading posts.</p>
          <button
            type="button"
            onClick={() => { setAttempt((prev) => prev + 1) }}
            className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <p className="text-center text-neutral-600">No posts yet.</p>
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => <BlogPostCard key={post.slug} post={post} />)}
          </ul>
          {items.length < totalCount && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-neutral-300 px-6 py-2 text-sm font-medium disabled:opacity-50"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
