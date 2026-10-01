import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useIngredients } from '@/hooks/useIngredients'
import { createSandwich, deleteSandwich, fetchAdminSandwiches, updateSandwich } from '@/api/admin'
import type { AdminSandwich, CanonicalIngredients, SandwichInput } from '@/api/admin'
import MarkdownText from '@/components/MarkdownText'
import { DIETARY_TAGS } from '@/data/dietaryTags'
import { REGIONS } from '@/data/regions'
import type { Region } from '@/data/regions'
import { nextSort, sortRows } from '@/utils/tableSort'
import type { SortState } from '@/utils/tableSort'
import SortableHeader from '@/pages/admin/SortableHeader'


type SandwichSortKey = 'name' | 'region' | 'country' | 'rating' | 'published'

const filterInputClass = 'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm'

type Editing = { mode: 'create' } | { mode: 'edit'; sandwich: AdminSandwich }

type FormState = {
  name: string
  slug: string
  alternativeNames: string
  description: string
  history: string
  originCountry: string
  originRegion: Region | ''
  dietaryTags: string[]
  imageUrl: string
  ingredientText: Record<string, string>
}

const slugify = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const ingredientsToText = (ingredients: CanonicalIngredients): Record<string, string> =>
  Object.fromEntries(
    Object.entries(ingredients).map(([category, items]) => [category, items.map((item) => item.name).join(', ')]),
  )

const parseIngredientNames = (text: string): { name: string }[] =>
  text
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '')
    .map((name) => ({ name }))

const emptyForm: FormState = {
  name: '',
  slug: '',
  alternativeNames: '',
  description: '',
  history: '',
  originCountry: '',
  originRegion: '',
  dietaryTags: [],
  imageUrl: '',
  ingredientText: {},
}

const formFromSandwich = (sandwich: AdminSandwich): FormState => ({
  name: sandwich.name,
  slug: sandwich.slug,
  alternativeNames: sandwich.alternative_names.join(', '),
  description: sandwich.description ?? '',
  history: sandwich.history ?? '',
  originCountry: sandwich.origin_country ?? '',
  originRegion: sandwich.origin_region ?? '',
  dietaryTags: sandwich.dietary_tags,
  imageUrl: sandwich.image_url ?? '',
  ingredientText: ingredientsToText(sandwich.canonical_ingredients),
})

const parseAlternativeNames = (text: string): string[] => [
  ...new Set(
    text
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== ''),
  ),
]

const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())

type SandwichFormProps = {
  editing: Editing
  categories: { slug: string; name: string }[]
  saving: boolean
  onSubmit: (input: SandwichInput) => void
  onCancel: () => void
}

function SandwichForm({ editing, categories, saving, onSubmit, onCancel }: SandwichFormProps) {
  const original = editing.mode === 'edit' ? editing.sandwich : null
  const [form, setForm] = useState<FormState>(original === null ? emptyForm : formFromSandwich(original))
  const [slugEdited, setSlugEdited] = useState(original !== null)
  const [previewing, setPreviewing] = useState(false)

  const patch = (changes: Partial<FormState>) => { setForm((prev) => ({ ...prev, ...changes })) }

  const handleNameChange = (name: string) => {
    patch(slugEdited ? { name } : { name, slug: slugify(name) })
  }

  const toggleTag = (tag: string) => {
    patch({
      dietaryTags: form.dietaryTags.includes(tag)
        ? form.dietaryTags.filter((t) => t !== tag)
        : [...form.dietaryTags, tag],
    })
  }

  const buildCanonicalIngredients = (): CanonicalIngredients => {
    const knownSlugs = categories.map((category) => category.slug)
    const preserved = Object.fromEntries(
      Object.entries(original?.canonical_ingredients ?? {}).filter(([slug]) => !knownSlugs.includes(slug)),
    )
    const edited = Object.fromEntries(
      categories
        .map((category) => [category.slug, parseIngredientNames(form.ingredientText[category.slug] ?? '')] as const)
        .filter(([, items]) => items.length > 0),
    )
    return { ...preserved, ...edited }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (form.name.trim() === '' || form.slug.trim() === '') {
      toast.error('Name and slug are required.')
      return
    }
    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim(),
      alternative_names: parseAlternativeNames(form.alternativeNames),
      description: blankToNull(form.description),
      history: blankToNull(form.history),
      origin_country: blankToNull(form.originCountry),
      origin_region: form.originRegion === '' ? null : form.originRegion,
      canonical_ingredients: buildCanonicalIngredients(),
      dietary_tags: form.dietaryTags,
      image_url: blankToNull(form.imageUrl),
    })
  }

  const inputClass = 'w-full rounded border border-neutral-300 px-2 py-1 text-sm'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <h2 className="font-display text-xl font-bold text-neutral-900">
        {original === null ? 'Add Sandwich' : `Edit ${original.name}`}
      </h2>

      <label className="block text-sm font-medium text-neutral-700">
        Name
        <input value={form.name} onChange={(e) => { handleNameChange(e.target.value) }} className={inputClass} />
      </label>

      <label className="block text-sm font-medium text-neutral-700">
        Slug
        <input
          value={form.slug}
          onChange={(e) => { setSlugEdited(true); patch({ slug: e.target.value }) }}
          className={inputClass}
        />
      </label>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Alternative names
          <input
            value={form.alternativeNames}
            onChange={(e) => { patch({ alternativeNames: e.target.value }) }}
            aria-describedby="alternative-names-help"
            className={inputClass}
          />
        </label>
        <p id="alternative-names-help" className="mt-1 text-xs text-neutral-500">
          Other names this sandwich is known by, separated by commas. Searching for any of them finds this entry.
        </p>
      </div>

      <label className="block text-sm font-medium text-neutral-700">
        Description
        <textarea
          value={form.description}
          onChange={(e) => { patch({ description: e.target.value }) }}
          rows={3}
          className={inputClass}
        />
      </label>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="history-field" className="text-sm font-medium text-neutral-700">History</label>
          <button
            type="button"
            onClick={() => { setPreviewing((prev) => !prev) }}
            className="text-xs text-primary underline"
          >
            {previewing ? 'Edit history' : 'Preview history'}
          </button>
        </div>
        {previewing ? (
          <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
            <MarkdownText>{form.history}</MarkdownText>
          </div>
        ) : (
          <textarea
            id="history-field"
            value={form.history}
            onChange={(e) => { patch({ history: e.target.value }) }}
            rows={8}
            className={inputClass}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium text-neutral-700">
          Country
          <input
            value={form.originCountry}
            onChange={(e) => { patch({ originCountry: e.target.value }) }}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-neutral-700">
          Region
          <select
            value={form.originRegion}
            onChange={(e) => { patch({ originRegion: e.target.value as Region | '' }) }}
            className={inputClass}
          >
            <option value="">—</option>
            {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-neutral-700">
        Image URL
        <input value={form.imageUrl} onChange={(e) => { patch({ imageUrl: e.target.value }) }} className={inputClass} />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-neutral-700">Dietary tags</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {DIETARY_TAGS.map(({ tag, label }) => (
            <label key={tag} className="flex items-center gap-1 text-sm text-neutral-600">
              <input type="checkbox" checked={form.dietaryTags.includes(tag)} onChange={() => { toggleTag(tag) }} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-neutral-700">Canonical ingredients (comma separated)</legend>
        {categories.map((category) => (
          <label key={category.slug} className="block text-xs text-neutral-600">
            {`${category.name} ingredients`}
            <input
              value={form.ingredientText[category.slug] ?? ''}
              onChange={(e) => { patch({ ingredientText: { ...form.ingredientText, [category.slug]: e.target.value } }) }}
              className={inputClass}
            />
          </label>
        ))}
      </fieldset>

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
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function DatabaseManagementPage() {
  const { session } = useAuth()
  const { categories } = useIngredients()
  const [sandwiches, setSandwiches] = useState<AdminSandwich[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState<SortState<SandwichSortKey>>({ key: 'name', direction: 'asc' })

  useEffect(() => {
    if (session === null) return
    fetchAdminSandwiches(session.access_token)
      .then(setSandwiches)
      .catch(() => { toast.error('Failed to load sandwiches.') })
      .finally(() => { setLoading(false) })
  }, [session])

  const replaceSandwich = (id: string, updated: AdminSandwich) => {
    setSandwiches((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  const handleTogglePublished = async (sandwich: AdminSandwich, published: boolean) => {
    if (session === null) return
    try {
      replaceSandwich(sandwich.id, await updateSandwich(session.access_token, sandwich.slug, { published }))
    } catch {
      toast.error('Failed to save sandwich.')
    }
  }

  const handleDelete = async (sandwich: AdminSandwich) => {
    if (session === null) return
    const confirmed = window.confirm(
      `Permanently delete "${sandwich.name}"? This also removes its ratings, comments and photos and cannot be undone.`,
    )
    if (!confirmed) return
    try {
      await deleteSandwich(session.access_token, sandwich.slug)
      setSandwiches((prev) => prev.filter((s) => s.id !== sandwich.id))
      toast.success('Sandwich deleted.')
    } catch {
      toast.error('Failed to delete sandwich.')
    }
  }

  const handleSubmit = async (input: SandwichInput) => {
    if (session === null || editing === null) return
    setSaving(true)
    try {
      if (editing.mode === 'create') {
        const created = await createSandwich(session.access_token, input)
        setSandwiches((prev) => [...prev, created])
      } else {
        replaceSandwich(editing.sandwich.id, await updateSandwich(session.access_token, editing.sandwich.slug, input))
      }
      toast.success('Sandwich saved.')
      setEditing(null)
    } catch {
      toast.error('Failed to save sandwich.')
    } finally {
      setSaving(false)
    }
  }

  const filtersActive = search !== '' || regionFilter !== '' || statusFilter !== ''

  const clearFilters = () => {
    setSearch('')
    setRegionFilter('')
    setStatusFilter('')
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = sandwiches.filter(
      (sandwich) =>
        (term === '' ||
          sandwich.name.toLowerCase().includes(term) ||
          sandwich.alternative_names.some((alternative) => alternative.toLowerCase().includes(term))) &&
        (regionFilter === '' || sandwich.origin_region === regionFilter) &&
        (statusFilter === '' || sandwich.published === (statusFilter === 'published')),
    )
    const byName = sortRows(filtered, { key: 'name', direction: 'asc' }, { name: (s) => s.name })
    return sortRows(byName, sort, {
      name: (s) => s.name,
      region: (s) => s.origin_region,
      country: (s) => s.origin_country,
      rating: (s) => s.avg_rating,
      published: (s) => s.published,
    })
  }, [sandwiches, search, regionFilter, statusFilter, sort])

  if (editing !== null) {
    return (
      <SandwichForm
        editing={editing}
        categories={categories}
        saving={saving}
        onSubmit={(input) => { void handleSubmit(input) }}
        onCancel={() => { setEditing(null) }}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-neutral-900">Sandwiches</h1>
        <button
          type="button"
          onClick={() => { setEditing({ mode: 'create' }) }}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          Add Sandwich
        </button>
      </div>

      {!loading && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label="Search sandwiches"
            value={search}
            onChange={(e) => { setSearch(e.target.value) }}
            placeholder="Search by name or alternative name"
            className={`${filterInputClass} w-64`}
          />
          <select aria-label="Filter by region" value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value) }} className={filterInputClass}>
            <option value="">All regions</option>
            {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value) }} className={filterInputClass}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="text-sm text-primary underline">
              Clear filters
            </button>
          )}
          <p className="text-sm text-neutral-500">{`Showing ${String(visible.length)} of ${String(sandwiches.length)} sandwiches`}</p>
        </div>
      )}

      {!loading && sandwiches.length > 0 && visible.length === 0 && (
        <p className="mb-4 text-sm text-neutral-600">No sandwiches match these filters.</p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-300 text-xs uppercase text-neutral-500">
              <SortableHeader label="Name" sortKey="name" sort={sort} onSort={(key) => { setSort((prev) => nextSort(prev, key)) }} />
              <SortableHeader label="Region" sortKey="region" sort={sort} onSort={(key) => { setSort((prev) => nextSort(prev, key)) }} />
              <SortableHeader label="Country" sortKey="country" sort={sort} onSort={(key) => { setSort((prev) => nextSort(prev, key)) }} />
              <SortableHeader label="Rating" sortKey="rating" sort={sort} onSort={(key) => { setSort((prev) => nextSort(prev, key)) }} />
              <SortableHeader label="Published" sortKey="published" sort={sort} onSort={(key) => { setSort((prev) => nextSort(prev, key)) }} centered />
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((sandwich) => (
              <tr key={sandwich.id} className="border-b border-neutral-200">
                <td className="p-2 text-sm font-medium text-neutral-900">{sandwich.name}</td>
                <td className="p-2 text-sm text-neutral-600">{sandwich.origin_region}</td>
                <td className="p-2 text-sm text-neutral-600">{sandwich.origin_country}</td>
                <td className="p-2 text-sm text-neutral-600">
                  {sandwich.avg_rating === null ? '—' : `${String(sandwich.avg_rating)} (${String(sandwich.rating_count)})`}
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Published: ${sandwich.name}`}
                    checked={sandwich.published}
                    onChange={(e) => { void handleTogglePublished(sandwich, e.target.checked) }}
                  />
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    aria-label={`Edit ${sandwich.name}`}
                    onClick={() => { setEditing({ mode: 'edit', sandwich }) }}
                    className="text-sm text-primary underline"
                  >
                    Edit
                  </button>
                  {!sandwich.published && (
                    <button
                      type="button"
                      aria-label={`Delete ${sandwich.name}`}
                      onClick={() => { void handleDelete(sandwich) }}
                      className="ml-3 text-sm text-red-600 underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
