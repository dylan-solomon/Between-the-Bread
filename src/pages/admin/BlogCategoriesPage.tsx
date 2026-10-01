import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import {
  createBlogCategory,
  deleteBlogCategory,
  fetchBlogCategories,
  updateBlogCategory,
} from '@/api/admin'
import type { AdminBlogCategory } from '@/api/admin'

const inputClass = 'rounded border border-neutral-300 px-2 py-1 text-sm'

const hasErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code

const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const byDisplayOrder = (categories: AdminBlogCategory[]): AdminBlogCategory[] =>
  [...categories].sort((a, b) => a.display_order - b.display_order)

const move = (categories: AdminBlogCategory[], from: number, to: number): AdminBlogCategory[] => {
  const reordered = [...categories]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(to, 0, moved)
  return reordered
}

type EditRowProps = {
  category: AdminBlogCategory
  saving: boolean
  onSave: (changes: { name: string; description: string | null }) => void
  onCancel: () => void
}

function EditRow({ category, saving, onSave, onCancel }: EditRowProps) {
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description ?? '')

  return (
    <tr className="border-b border-neutral-200 bg-neutral-50">
      <td className="p-2">
        <input aria-label="Name" value={name} onChange={(e) => { setName(e.target.value) }} className={`${inputClass} w-full`} />
      </td>
      <td className="p-2 text-sm text-neutral-600">{category.slug}</td>
      <td className="p-2 text-sm text-neutral-600">{category.post_count}</td>
      <td className="p-2">
        <input
          aria-label="Description"
          value={description}
          onChange={(e) => { setDescription(e.target.value) }}
          className={`${inputClass} w-full`}
        />
      </td>
      <td className="p-2">
        <button
          type="button"
          disabled={saving || name.trim() === ''}
          onClick={() => { onSave({ name: name.trim(), description: blankToNull(description) }) }}
          className="text-sm text-primary underline disabled:opacity-50"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="ml-3 text-sm text-neutral-600 underline">
          Cancel
        </button>
      </td>
    </tr>
  )
}

export default function BlogCategoriesPage() {
  const { session } = useAuth()
  const [categories, setCategories] = useState<AdminBlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = (token: string) =>
    fetchBlogCategories(token)
      .then((loaded) => { setCategories(byDisplayOrder(loaded)) })
      .catch(() => { toast.error('Failed to load blog categories.') })
      .finally(() => { setLoading(false) })

  useEffect(() => {
    if (session === null) return
    void load(session.access_token)
  }, [session])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    if (session === null) return
    setAdding(true)
    try {
      const created = await createBlogCategory(session.access_token, {
        name: newName.trim(),
        description: blankToNull(newDescription),
      })
      setCategories((prev) => [...prev, created])
      setNewName('')
      setNewDescription('')
      toast.success('Category added.')
    } catch (error) {
      toast.error(
        hasErrorCode(error, 'SLUG_TAKEN') ? 'A category with that name already exists.' : 'Failed to add category.',
      )
    } finally {
      setAdding(false)
    }
  }

  const handleSave = async (category: AdminBlogCategory, changes: { name: string; description: string | null }) => {
    if (session === null) return
    setSaving(true)
    try {
      const updated = await updateBlogCategory(session.access_token, category.slug, changes)
      setCategories((prev) => prev.map((existing) => (existing.id === category.id ? updated : existing)))
      setEditingSlug(null)
      toast.success('Category saved.')
    } catch {
      toast.error('Failed to save category.')
    } finally {
      setSaving(false)
    }
  }

  const handleMove = async (from: number, to: number) => {
    if (session === null) return
    const reordered = move(categories, from, to).map((category, index) => ({ ...category, display_order: index + 1 }))
    const changed = reordered.filter((category) => {
      const before = categories.find((existing) => existing.id === category.id)
      return before?.display_order !== category.display_order
    })
    try {
      await Promise.all(
        changed.map((category) =>
          updateBlogCategory(session.access_token, category.slug, { display_order: category.display_order }),
        ),
      )
      setCategories(reordered)
    } catch {
      toast.error('Failed to reorder categories.')
      void load(session.access_token)
    }
  }

  const handleDelete = async (category: AdminBlogCategory) => {
    if (session === null) return
    if (!window.confirm(`Delete the category "${category.name}"? This cannot be undone.`)) return
    try {
      await deleteBlogCategory(session.access_token, category.slug)
      setCategories((prev) => prev.filter((existing) => existing.id !== category.id))
      toast.success('Category deleted.')
    } catch (error) {
      toast.error(
        hasErrorCode(error, 'CATEGORY_IN_USE')
          ? 'That category is used by posts, so it cannot be deleted.'
          : 'Failed to delete category.',
      )
    }
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold text-neutral-900">Blog categories</h1>

      <form onSubmit={(event) => { void handleAdd(event) }} className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-neutral-700">
          New category name
          <input value={newName} onChange={(e) => { setNewName(e.target.value) }} className={`${inputClass} mt-1 block w-56`} />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          New category description
          <input
            value={newDescription}
            onChange={(e) => { setNewDescription(e.target.value) }}
            className={`${inputClass} mt-1 block w-80`}
          />
        </label>
        <button
          type="submit"
          disabled={adding || newName.trim() === ''}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Add category
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-neutral-600">No categories yet.</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-xs uppercase text-neutral-500">
              <th className="p-2">Name</th>
              <th className="p-2">Slug</th>
              <th className="p-2">Posts</th>
              <th className="p-2">Description</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) =>
              editingSlug === category.slug ? (
                <EditRow
                  key={category.id}
                  category={category}
                  saving={saving}
                  onSave={(changes) => { void handleSave(category, changes) }}
                  onCancel={() => { setEditingSlug(null) }}
                />
              ) : (
                <tr key={category.id} className="border-b border-neutral-200">
                  <td className="p-2 text-sm font-medium text-neutral-900">{category.name}</td>
                  <td className="p-2 text-sm text-neutral-600">{category.slug}</td>
                  <td className="p-2 text-sm text-neutral-600">{category.post_count}</td>
                  <td className="p-2 text-sm text-neutral-600">{category.description}</td>
                  <td className="whitespace-nowrap p-2">
                    <button
                      type="button"
                      aria-label={`Move ${category.name} up`}
                      disabled={index === 0}
                      onClick={() => { void handleMove(index, index - 1) }}
                      className="mr-2 text-sm text-neutral-700 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${category.name} down`}
                      disabled={index === categories.length - 1}
                      onClick={() => { void handleMove(index, index + 1) }}
                      className="mr-3 text-sm text-neutral-700 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => { setEditingSlug(category.slug) }}
                      className="text-sm text-primary underline"
                    >
                      Edit
                    </button>
                    {category.post_count === 0 && (
                      <button
                        type="button"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => { void handleDelete(category) }}
                        className="ml-3 text-sm text-red-600 underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
