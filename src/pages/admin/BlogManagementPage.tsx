import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { createPost, deletePost, fetchAdminPosts, fetchBlogCategories, updatePost } from '@/api/admin'
import type { AdminBlogCategory, AdminBlogPost, BlogPostInput } from '@/api/admin'
import BlogPostForm from '@/pages/admin/BlogPostForm'
import { postStatus } from '@/utils/blogPost'
import type { PostStatus } from '@/utils/blogPost'

const STATUSES: PostStatus[] = ['Draft', 'Scheduled', 'Published']

const filterInputClass = 'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm'

const STATUS_CLASSES: Record<PostStatus, string> = {
  Draft: 'bg-neutral-200 text-neutral-700',
  Scheduled: 'bg-amber-100 text-amber-800',
  Published: 'bg-green-100 text-green-800',
}

type Editing = { mode: 'create' } | { mode: 'edit'; post: AdminBlogPost }

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code

const detailOf = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'detail' in error && typeof error.detail === 'string'
    ? error.detail
    : undefined

const saveErrorMessage = (error: unknown): string => {
  if (hasErrorCode(error, 'SLUG_TAKEN')) return 'A post with that slug already exists.'
  if (hasErrorCode(error, 'INVALID_INPUT') || hasErrorCode(error, 'CATEGORY_REQUIRED')) {
    return detailOf(error) ?? 'Failed to save post.'
  }
  return 'Failed to save post.'
}

export default function BlogManagementPage() {
  const { session } = useAuth()
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [categories, setCategories] = useState<AdminBlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (session === null) return
    fetchAdminPosts(session.access_token)
      .then(setPosts)
      .catch(() => { toast.error('Failed to load posts.') })
      .finally(() => { setLoading(false) })
    fetchBlogCategories(session.access_token)
      .then(setCategories)
      .catch(() => { toast.error('Failed to load blog categories.') })
  }, [session])

  const handleSubmit = async (input: BlogPostInput) => {
    if (session === null || editing === null) return
    setSaving(true)
    try {
      if (editing.mode === 'create') {
        const created = await createPost(session.access_token, input)
        setPosts((prev) => [created, ...prev])
      } else {
        const updated = await updatePost(session.access_token, editing.post.slug, input)
        setPosts((prev) => prev.map((post) => (post.id === updated.id ? updated : post)))
      }
      toast.success('Post saved.')
      setEditing(null)
    } catch (error) {
      toast.error(saveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (post: AdminBlogPost) => {
    if (session === null) return
    if (!window.confirm(`Permanently delete "${post.title}"? This cannot be undone.`)) return
    try {
      await deletePost(session.access_token, post.slug)
      setPosts((prev) => prev.filter((existing) => existing.id !== post.id))
      toast.success('Post deleted.')
    } catch {
      toast.error('Failed to delete post.')
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return posts.filter(
      (post) =>
        (term === '' || post.title.toLowerCase().includes(term)) &&
        (statusFilter === '' || postStatus(post) === statusFilter),
    )
  }, [posts, search, statusFilter])

  if (editing !== null) {
    return (
      <BlogPostForm
        post={editing.mode === 'edit' ? editing.post : null}
        categories={categories}
        saving={saving}
        onSubmit={(input) => { void handleSubmit(input) }}
        onCancel={() => { setEditing(null) }}
      />
    )
  }

  const filtersActive = search !== '' || statusFilter !== ''

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Blog</h1>
        <button
          type="button"
          onClick={() => { setEditing({ mode: 'create' }) }}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          New post
        </button>
      </div>

      {!loading && posts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label="Search posts"
            value={search}
            onChange={(e) => { setSearch(e.target.value) }}
            placeholder="Search by title"
            className={`${filterInputClass} w-64`}
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value) }}
            className={filterInputClass}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {filtersActive && (
            <button type="button" onClick={() => { setSearch(''); setStatusFilter('') }} className="text-sm text-primary underline">
              Clear filters
            </button>
          )}
          <p className="text-sm text-neutral-500">{`Showing ${String(visible.length)} of ${String(posts.length)} posts`}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-neutral-600">No posts yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-neutral-600">No posts match these filters.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-xs uppercase text-neutral-500">
              <th className="p-2">Title</th>
              <th className="p-2">Status</th>
              <th className="p-2">Categories</th>
              <th className="p-2">Publish date</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((post) => {
              const status = postStatus(post)
              return (
                <tr key={post.id} className="border-b border-neutral-200">
                  <td className="p-2 text-sm font-medium text-neutral-900">{post.title}</td>
                  <td className="p-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{status}</span>
                  </td>
                  <td className="p-2 text-sm text-neutral-600">{post.categories.map((category) => category.name).join(', ')}</td>
                  <td className="p-2 text-sm text-neutral-600">
                    {post.published_at === null ? '—' : new Date(post.published_at).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      aria-label={`Edit ${post.title}`}
                      onClick={() => { setEditing({ mode: 'edit', post }) }}
                      className="text-sm text-primary underline"
                    >
                      Edit
                    </button>
                    {!post.published && (
                      <button
                        type="button"
                        aria-label={`Delete ${post.title}`}
                        onClick={() => { void handleDelete(post) }}
                        className="ml-3 text-sm text-red-600 underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
