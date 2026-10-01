import { isSlug, slugify } from './slug.js'

const MAX_NAME_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 300

type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string }

type Mode = 'create' | 'update'

type FieldCheck = { field: string; valid: (value: unknown) => boolean; message: string }

const CHECKS: FieldCheck[] = [
  {
    field: 'name',
    valid: (value) => typeof value === 'string' && value.trim() !== '' && value.trim().length <= MAX_NAME_LENGTH,
    message: `name must be 1-${String(MAX_NAME_LENGTH)} characters.`,
  },
  {
    field: 'description',
    valid: (value) => value === null || (typeof value === 'string' && value.length <= MAX_DESCRIPTION_LENGTH),
    message: `description must be text of up to ${String(MAX_DESCRIPTION_LENGTH)} characters.`,
  },
  {
    field: 'display_order',
    valid: (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0,
    message: 'display_order must be a whole number of 0 or more.',
  },
]

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const parseCreate = (input: Record<string, unknown>): ParseResult => {
  if (input.name === undefined) return { ok: false, message: 'name is required.' }

  const failing = CHECKS.find(({ field, valid }) => input[field] !== undefined && !valid(input[field]))
  if (failing !== undefined) return { ok: false, message: failing.message }

  const name = trimmed(input.name)
  const slug = input.slug === undefined ? slugify(name) : input.slug
  if (slug === '') return { ok: false, message: 'slug could not be created from the name; provide one.' }
  if (!isSlug(slug)) return { ok: false, message: 'slug must be lowercase letters, numbers and hyphens.' }

  const optional = input.display_order === undefined ? {} : { display_order: input.display_order }
  return { ok: true, value: { name, slug, description: input.description ?? null, ...optional } }
}

const parseUpdate = (input: Record<string, unknown>): ParseResult => {
  if (input.slug !== undefined) return { ok: false, message: 'slug cannot be changed.' }

  const provided = CHECKS.filter(({ field }) => input[field] !== undefined)
  const failing = provided.find(({ field, valid }) => !valid(input[field]))
  if (failing !== undefined) return { ok: false, message: failing.message }

  if (provided.length === 0) {
    return { ok: false, message: 'Request body must contain at least one editable field.' }
  }

  const value = Object.fromEntries(
    provided.map(({ field }) => [field, field === 'name' ? trimmed(input[field]) : input[field]]),
  )
  return { ok: true, value }
}

export const parseBlogCategoryInput = (body: unknown, mode: Mode): ParseResult => {
  const input = isPlainObject(body) ? body : {}
  return mode === 'create' ? parseCreate(input) : parseUpdate(input)
}
