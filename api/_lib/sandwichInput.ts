import { isDietaryTag } from './dietaryTags.js'
import { isRegion } from './regions.js'
import { isSlug } from './slug.js'

const MAX_NAME_LENGTH = 120
const MAX_ALTERNATIVE_NAMES = 10

type ParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string }

type Mode = 'create' | 'update'

type FieldCheck = { field: string; valid: (value: unknown) => boolean; message: string }

const isNullableString = (value: unknown): boolean => value === null || typeof value === 'string'

const isHttpUrl = (value: unknown): boolean => {
  if (value === null) return true
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isIngredientList = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every((item) => isPlainObject(item) && typeof item.name === 'string' && item.name.trim() !== '')

const isCanonicalIngredients = (value: unknown): boolean =>
  isPlainObject(value) && Object.values(value).every(isIngredientList)

const isAlternativeNames = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length <= MAX_ALTERNATIVE_NAMES &&
  value.every((name) => typeof name === 'string' && name.trim() !== '' && name.length <= MAX_NAME_LENGTH)

const CHECKS: FieldCheck[] = [
  {
    field: 'name',
    valid: (value) => typeof value === 'string' && value.trim() !== '' && value.length <= MAX_NAME_LENGTH,
    message: `name must be 1-${String(MAX_NAME_LENGTH)} characters.`,
  },
  { field: 'slug', valid: isSlug, message: 'slug must be lowercase letters, numbers and hyphens.' },
  {
    field: 'alternative_names',
    valid: isAlternativeNames,
    message: `alternative_names must be a list of up to ${String(MAX_ALTERNATIVE_NAMES)} names of 1-${String(MAX_NAME_LENGTH)} characters.`,
  },
  { field: 'description', valid: isNullableString, message: 'description must be text.' },
  { field: 'history', valid: isNullableString, message: 'history must be text.' },
  { field: 'origin_country', valid: isNullableString, message: 'origin_country must be text.' },
  {
    field: 'origin_region',
    valid: (value) => value === null || (typeof value === 'string' && isRegion(value)),
    message: 'origin_region is not a recognised region.',
  },
  {
    field: 'canonical_ingredients',
    valid: isCanonicalIngredients,
    message: 'canonical_ingredients must map categories to lists of { name } entries.',
  },
  {
    field: 'dietary_tags',
    valid: (value) => Array.isArray(value) && value.every((tag) => typeof tag === 'string' && isDietaryTag(tag)),
    message: 'dietary_tags must be a list of supported dietary tags.',
  },
  { field: 'image_url', valid: isHttpUrl, message: 'image_url must be an http(s) URL.' },
  { field: 'published', valid: (value) => typeof value === 'boolean', message: 'published must be true or false.' },
]

const REQUIRED_ON_CREATE = ['name', 'slug']

const CREATE_DEFAULTS: Record<string, unknown> = {
  alternative_names: [],
  canonical_ingredients: {},
  dietary_tags: [],
  published: false,
}

export const parseSandwichInput = (body: unknown, mode: Mode): ParseResult => {
  const input = isPlainObject(body) ? body : {}
  const isProvided = (field: string): boolean => input[field] !== undefined

  const missing = mode === 'create' ? REQUIRED_ON_CREATE.find((field) => !isProvided(field)) : undefined
  if (missing !== undefined) return { ok: false, message: `${missing} is required.` }

  const provided = CHECKS.filter(({ field }) => isProvided(field))
  const failing = provided.find(({ field, valid }) => !valid(input[field]))
  if (failing !== undefined) return { ok: false, message: failing.message }

  if (mode === 'update' && provided.length === 0) {
    return { ok: false, message: 'Request body must contain at least one editable field.' }
  }

  const value = Object.fromEntries(provided.map(({ field }) => [field, input[field]]))
  return { ok: true, value: mode === 'create' ? { ...CREATE_DEFAULTS, ...value } : value }
}
