import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useBlocker } from 'react-router-dom'
import { toast } from 'sonner'
import { BLOG_IMAGE_TYPES, uploadBlogImage } from '@/api/blogImages'
import MarkdownText from '@/components/MarkdownText'
import RelatedSandwichPicker from '@/pages/admin/RelatedSandwichPicker'
import type { AdminBlogCategory, AdminBlogPost, BlogPostInput } from '@/api/admin'
import { fromDateTimeLocal, toDateTimeLocal } from '@/utils/blogPost'
import { slugify } from '@/utils/slugify'

const DEFAULT_BYLINE = 'Between the Bread'
const NEEDS_CATEGORY = 'Choose at least one category to publish this post.'
const UNSAVED_PROMPT = 'You have unsaved changes. Leave without saving?'
const FILE_BUTTON_CLASS =
  'inline-block cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50'

type FormState = {
  title: string
  slug: string
  excerpt: string
  body: string
  coverImageUrl: string
  metaDescription: string
  authorName: string
  categorySlugs: string[]
  relatedSandwichSlugs: string[]
  published: boolean
  publishDate: string
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImageUrl: '',
  metaDescription: '',
  authorName: DEFAULT_BYLINE,
  categorySlugs: [],
  relatedSandwichSlugs: [],
  published: false,
  publishDate: '',
}

const formFromPost = (post: AdminBlogPost): FormState => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  body: post.body,
  coverImageUrl: post.cover_image_url ?? '',
  metaDescription: post.meta_description ?? '',
  authorName: post.author_name,
  categorySlugs: post.categories.map((category) => category.slug),
  relatedSandwichSlugs: post.related_sandwich_slugs,
  published: post.published,
  publishDate: toDateTimeLocal(post.published_at),
})

const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const publishedAtFor = (form: FormState): Pick<BlogPostInput, 'published_at'> => {
  const chosen = fromDateTimeLocal(form.publishDate)
  if (chosen !== null) return { published_at: chosen }
  return form.published ? {} : { published_at: null }
}

const altTextFor = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '')

const isInTheFuture = (localDateTime: string): boolean => {
  const iso = fromDateTimeLocal(localDateTime)
  return iso !== null && new Date(iso).getTime() > Date.now()
}

type Props = {
  post: AdminBlogPost | null
  categories: AdminBlogCategory[]
  saving: boolean
  onSubmit: (input: BlogPostInput) => void
  onCancel: () => void
}

export default function BlogPostForm({ post, categories, saving, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(post === null ? emptyForm : formFromPost(post))
  const [slugEdited, setSlugEdited] = useState(post !== null)
  const [previewing, setPreviewing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [initialSnapshot] = useState(() => JSON.stringify(post === null ? emptyForm : formFromPost(post)))
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const cursorAfterInsert = useRef<number | null>(null)

  const dirty = JSON.stringify(form) !== initialSnapshot
  const blocker = useBlocker(dirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(UNSAVED_PROMPT)) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn) }
  }, [dirty])

  useEffect(() => {
    const position = cursorAfterInsert.current
    if (position === null || bodyRef.current === null) return
    cursorAfterInsert.current = null
    bodyRef.current.focus()
    bodyRef.current.setSelectionRange(position, position)
  }, [form.body])

  const patch = (changes: Partial<FormState>) => { setForm((prev) => ({ ...prev, ...changes })) }

  const handleTitleChange = (title: string) => {
    patch(slugEdited ? { title } : { title, slug: slugify(title) })
  }

  const toggleCategory = (slug: string) => {
    patch({
      categorySlugs: form.categorySlugs.includes(slug)
        ? form.categorySlugs.filter((existing) => existing !== slug)
        : [...form.categorySlugs, slug],
    })
  }

  const upload = async (file: File | undefined): Promise<string | null> => {
    if (file === undefined) return null
    setUploading(true)
    try {
      return await uploadBlogImage(file)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image. Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleInsertImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const start = bodyRef.current?.selectionStart ?? form.body.length
    const end = bodyRef.current?.selectionEnd ?? start
    const url = await upload(file)
    if (url === null || file === undefined) return
    const markdown = `![${altTextFor(file.name)}](${url})`
    cursorAfterInsert.current = start + markdown.length
    setForm((prev) => ({
      ...prev,
      body: `${prev.body.slice(0, start)}${markdown}${prev.body.slice(end)}`,
    }))
  }

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    const url = await upload(file)
    if (url !== null) patch({ coverImageUrl: url })
  }

  const handleCancel = () => {
    if (dirty && !window.confirm(UNSAVED_PROMPT)) return
    onCancel()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (form.title.trim() === '' || form.slug.trim() === '') {
      toast.error('Title and slug are required.')
      return
    }
    if (form.published && form.categorySlugs.length === 0) {
      toast.error(NEEDS_CATEGORY)
      return
    }
    onSubmit({
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      body: form.body,
      cover_image_url: blankToNull(form.coverImageUrl),
      meta_description: blankToNull(form.metaDescription),
      author_name: form.authorName.trim() === '' ? DEFAULT_BYLINE : form.authorName.trim(),
      related_sandwich_slugs: form.relatedSandwichSlugs,
      published: form.published,
      ...publishedAtFor(form),
      category_slugs: form.categorySlugs,
    })
  }

  const inputClass = 'w-full rounded border border-neutral-300 px-2 py-1 text-sm'
  const noCategory = form.categorySlugs.length === 0
  const scheduled = form.published && isInTheFuture(form.publishDate)

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <h2 className="font-display text-xl font-bold text-neutral-900">
        {post === null ? 'New post' : `Edit ${post.title}`}
      </h2>

      <label className="block text-sm font-medium text-neutral-700">
        Title
        <input value={form.title} onChange={(e) => { handleTitleChange(e.target.value) }} className={inputClass} />
      </label>

      <label className="block text-sm font-medium text-neutral-700">
        Slug
        <input
          value={form.slug}
          onChange={(e) => { setSlugEdited(true); patch({ slug: e.target.value }) }}
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-neutral-700">
        Excerpt
        <textarea value={form.excerpt} onChange={(e) => { patch({ excerpt: e.target.value }) }} rows={2} className={inputClass} />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-neutral-700">Categories</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {categories.map((category) => (
            <label key={category.slug} className="flex items-center gap-1 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={form.categorySlugs.includes(category.slug)}
                onChange={() => { toggleCategory(category.slug) }}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="post-body" className="text-sm font-medium text-neutral-700">Body</label>
          <div className="flex items-center gap-3">
            <label className={`${FILE_BUTTON_CLASS} ${previewing || uploading ? 'opacity-50' : ''}`}>
              Insert image
              <input
                type="file"
                accept={BLOG_IMAGE_TYPES.join(',')}
                aria-label="Insert image"
                disabled={previewing || uploading}
                className="sr-only"
                onChange={(e) => { void handleInsertImage(e) }}
              />
            </label>
            <button
              type="button"
              onClick={() => { setPreviewing((prev) => !prev) }}
              className="text-xs text-primary underline"
            >
              {previewing ? 'Edit body' : 'Preview body'}
            </button>
          </div>
        </div>
        {previewing ? (
          <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <MarkdownText>{form.body}</MarkdownText>
          </div>
        ) : (
          <textarea
            id="post-body"
            ref={bodyRef}
            value={form.body}
            onChange={(e) => { patch({ body: e.target.value }) }}
            rows={16}
            className={inputClass}
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="post-cover" className="text-sm font-medium text-neutral-700">Cover image URL</label>
          <label className={`${FILE_BUTTON_CLASS} ${uploading ? 'opacity-50' : ''}`}>
            Upload cover image
            <input
              type="file"
              accept={BLOG_IMAGE_TYPES.join(',')}
              aria-label="Upload cover image"
              disabled={uploading}
              className="sr-only"
              onChange={(e) => { void handleCoverUpload(e) }}
            />
          </label>
        </div>
        <input
          id="post-cover"
          value={form.coverImageUrl}
          onChange={(e) => { patch({ coverImageUrl: e.target.value }) }}
          className={inputClass}
        />
        {form.coverImageUrl.trim() !== '' && (
          <img src={form.coverImageUrl.trim()} alt="Cover preview" className="mt-2 max-h-40 rounded-md object-cover" />
        )}
      </div>

      <RelatedSandwichPicker
        selected={form.relatedSandwichSlugs}
        onChange={(slugs) => { patch({ relatedSandwichSlugs: slugs }) }}
      />

      <label className="block text-sm font-medium text-neutral-700">
        Meta description
        <input value={form.metaDescription} onChange={(e) => { patch({ metaDescription: e.target.value }) }} className={inputClass} />
      </label>

      <label className="block text-sm font-medium text-neutral-700">
        Byline
        <input value={form.authorName} onChange={(e) => { patch({ authorName: e.target.value }) }} className={inputClass} />
      </label>

      <div className="space-y-2 rounded border border-neutral-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={form.published}
            disabled={noCategory && !form.published}
            onChange={(e) => { patch({ published: e.target.checked }) }}
          />
          Published
        </label>
        {noCategory && <p className="text-xs text-amber-700">{NEEDS_CATEGORY}</p>}

        <label className="block text-sm font-medium text-neutral-700">
          Publish date
          <input
            type="datetime-local"
            value={form.publishDate}
            onChange={(e) => { patch({ publishDate: e.target.value }) }}
            className="mt-1 block rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <p className="text-xs text-neutral-500">
          Leave empty to publish as soon as you save. A future date schedules the post.
        </p>
        {scheduled && <p className="text-xs text-neutral-700">This post will go live on the date above.</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
