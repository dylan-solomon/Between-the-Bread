import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useIngredients } from '@/hooks/useIngredients'
import { fetchAdminIngredients, updateIngredient, createIngredient } from '@/api/admin'
import type { AdminIngredient } from '@/api/admin'
import { DIETARY_TAGS } from '@/data/dietaryTags'
import IngredientDetailsDialog from '@/pages/admin/IngredientDetailsDialog'
import { hasCompleteData } from '@/utils/ingredientData'

const COMPAT_GROUPS = ['american', 'asian_fusion', 'deli_classic', 'italian', 'mediterranean', 'neutral', 'southern', 'tex_mex'] as const

type RowProps = {
  ingredient: AdminIngredient
  categoryName: string
  onSave: (id: string, patch: Partial<AdminIngredient>) => void
  onEditDetails: (ingredient: AdminIngredient) => void
}

function IngredientRow({ ingredient, categoryName, onSave, onEditDetails }: RowProps) {
  const [name, setName] = useState(ingredient.name)
  const complete = hasCompleteData(ingredient)

  useEffect(() => { setName(ingredient.name) }, [ingredient.name])

  const toggleTag = (tag: string) => {
    const next = ingredient.dietary_tags.includes(tag)
      ? ingredient.dietary_tags.filter((t) => t !== tag)
      : [...ingredient.dietary_tags, tag]
    onSave(ingredient.id, { dietary_tags: next })
  }

  return (
    <tr className="border-b border-neutral-200">
      <td className="p-2">
        <input
          aria-label={`Name: ${ingredient.name}`}
          value={name}
          onChange={(e) => { setName(e.target.value) }}
          onBlur={() => { if (name.trim() !== '' && name !== ingredient.name) onSave(ingredient.id, { name }) }}
          className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </td>
      <td className="p-2 text-sm text-neutral-600">{categoryName}</td>
      <td className="p-2 text-center">
        <input
          type="checkbox"
          aria-label={`Enabled: ${ingredient.name}`}
          checked={ingredient.enabled}
          disabled={!ingredient.enabled && !complete}
          title={!ingredient.enabled && !complete ? 'Add nutrition and cost data before enabling' : undefined}
          onChange={(e) => { onSave(ingredient.id, { enabled: e.target.checked }) }}
        />
      </td>
      <td className="p-2">
        <select
          aria-label={`Compat group: ${ingredient.name}`}
          value={ingredient.compat_group ?? ''}
          onChange={(e) => { onSave(ingredient.id, { compat_group: e.target.value }) }}
          className="rounded border border-neutral-300 px-1 py-1 text-xs"
        >
          <option value="">—</option>
          {COMPAT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </td>
      <td className="p-2">
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map(({ tag, label }) => (
            <label key={tag} className="flex items-center gap-1 text-xs text-neutral-600">
              <input
                type="checkbox"
                aria-label={`${label}: ${ingredient.name}`}
                checked={ingredient.dietary_tags.includes(tag)}
                onChange={() => { toggleTag(tag) }}
              />
              {label}
            </label>
          ))}
        </div>
      </td>
      <td className="p-2">
        <button
          type="button"
          aria-label={`Edit nutrition and cost: ${ingredient.name}`}
          onClick={() => { onEditDetails(ingredient) }}
          className="text-xs text-primary underline"
        >
          Nutrition &amp; cost
        </button>
        {!complete && <p className="mt-1 text-xs font-medium text-amber-700">Missing data</p>}
      </td>
    </tr>
  )
}

type NewIngredientForm = {
  name: string
  slug: string
  category_id: string
}

const INCOMPLETE_MESSAGE = 'Add nutrition and cost data before enabling this ingredient.'

const isIncompleteIngredient = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'INCOMPLETE_INGREDIENT'

export default function IngredientsPage() {
  const { session } = useAuth()
  const { categories } = useIngredients()
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIngredient, setNewIngredient] = useState<NewIngredientForm>({ name: '', slug: '', category_id: '' })
  const [creating, setCreating] = useState(false)
  const [detailsFor, setDetailsFor] = useState<AdminIngredient | null>(null)
  const [savingDetails, setSavingDetails] = useState(false)

  useEffect(() => {
    if (session === null) return
    fetchAdminIngredients(session.access_token)
      .then(setIngredients)
      .catch(() => { toast.error('Failed to load ingredients.') })
      .finally(() => { setLoading(false) })
  }, [session])

  const categoryName = (categoryId: string): string =>
    categories.find((c) => c.id === categoryId)?.name ?? 'Unknown'

  const handleSave = async (id: string, patch: Partial<AdminIngredient>) => {
    if (session === null) return
    try {
      const updated = await updateIngredient(session.access_token, id, patch)
      setIngredients((prev) => prev.map((i) => (i.id === id ? updated : i)))
    } catch (error) {
      toast.error(isIncompleteIngredient(error) ? INCOMPLETE_MESSAGE : 'Failed to save ingredient.')
    }
  }

  const handleSaveDetails = async (data: { nutrition: Record<string, number>; estimated_cost: Record<string, number> }) => {
    if (session === null || detailsFor === null) return
    setSavingDetails(true)
    try {
      const updated = await updateIngredient(session.access_token, detailsFor.id, data)
      setIngredients((prev) => prev.map((i) => (i.id === detailsFor.id ? updated : i)))
      setDetailsFor(null)
      toast.success('Nutrition and cost saved.')
    } catch {
      toast.error('Failed to save nutrition and cost.')
    } finally {
      setSavingDetails(false)
    }
  }

  const handleCreate = async () => {
    if (session === null) return
    if (newIngredient.name.trim() === '' || newIngredient.slug.trim() === '' || newIngredient.category_id === '') {
      toast.error('Name, slug, and category are required.')
      return
    }
    setCreating(true)
    try {
      const created = await createIngredient(session.access_token, { ...newIngredient, enabled: false })
      setIngredients((prev) => [...prev, created])
      setShowAddModal(false)
      setNewIngredient({ name: '', slug: '', category_id: '' })
      toast.success('Ingredient created.')
    } catch {
      toast.error('Failed to create ingredient.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Ingredients</h1>
        <button
          type="button"
          onClick={() => { setShowAddModal(true) }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          Add Ingredient
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-neutral-500">Loading...</p>}

      {!loading && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
                <th className="p-2">Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Enabled</th>
                <th className="p-2">Compat Group</th>
                <th className="p-2">Dietary Tags</th>
                <th className="p-2">Nutrition &amp; Cost</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <IngredientRow
                  key={ingredient.id}
                  ingredient={ingredient}
                  categoryName={categoryName(ingredient.category_id)}
                  onSave={(id, patch) => { void handleSave(id, patch) }}
                  onEditDetails={setDetailsFor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailsFor !== null && (
        <IngredientDetailsDialog
          ingredient={detailsFor}
          saving={savingDetails}
          onSave={(data) => { void handleSaveDetails(data) }}
          onCancel={() => { setDetailsFor(null) }}
        />
      )}

      {showAddModal && (
        <div role="dialog" aria-modal="true" aria-label="Add Ingredient" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-md bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-neutral-900">Add Ingredient</h2>
            <p className="mt-1 text-xs text-neutral-500">
              New ingredients start disabled. Once nutrition and cost data have been added, tick Enabled in the list to put the ingredient in the randomizer.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-neutral-700">
                Name
                <input
                  aria-label="Name"
                  value={newIngredient.name}
                  onChange={(e) => { setNewIngredient((prev) => ({ ...prev, name: e.target.value })) }}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-neutral-700">
                Slug
                <input
                  aria-label="Slug"
                  value={newIngredient.slug}
                  onChange={(e) => { setNewIngredient((prev) => ({ ...prev, slug: e.target.value })) }}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-neutral-700">
                Category
                <select
                  aria-label="Category"
                  value={newIngredient.category_id}
                  onChange={(e) => { setNewIngredient((prev) => ({ ...prev, category_id: e.target.value })) }}
                  className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAddModal(false) }}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => { void handleCreate() }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
