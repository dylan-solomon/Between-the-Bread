import { isHttpUrl, isPlainObject } from './fieldChecks.js'
import { readingTimeMinutes } from './readingTime.js'
import { isSlug, slugify } from './slug.js'

const MAX_TITLE_LENGTH = 150
const MAX_EXCERPT_LENGTH = 300
const MAX_BODY_LENGTH = 100000
const MAX_META_DESCRIPTION_LENGTH = 200
const MAX_AUTHOR_NAME_LENGTH = 80
const MAX_RELATED_SANDWICHES = 10
const MAX_CATEGORIES = 10
const RESERVED_SLUGS: readonly string[] = ['categories', 'category', 'rss']
const ISO_DATE_START = /^\d{4}-\d{2}-\d{2}/

type ParseResult =
  | { ok: true; value: Record<string, unknown>; categorySlugs?: string[] }
  | { ok: false; message: string }

type Mode = 'create' | 'update'

type FieldCheck = { field: string; valid: (value: unknown) => boolean; message: string }

const isTextUpTo = (limit: number) => (value: unknown): boolean =>
  typeof value === 'string' && value.length <= limit

const isNullableTextUpTo = (limit: number) => (value: unknown): boolean =>
  value === null || isTextUpTo(limit)(value)

const isTrimmedLengthBetween1And = (limit: number) => (value: unknown): boolean =>
  typeof value === 'string' && value.trim() !== '' && value.trim().length <= limit

const isSlugList = (limit: number) => (value: unknown): boolean =>
  Array.isArray(value) && value.length <= limit && value.every(isSlug)

const isDateTime = (value: unknown): boolean =>
  value === null || (typeof value === 'string' && ISO_DATE_START.test(value) && !Number.isNaN(Date.parse(value)))

const CHECKS: FieldCheck[] = [
  {
    field: 'title',
    valid: isTrimmedLengthBetween1And(MAX_TITLE_LENGTH),
    message: `title must be 1-${String(MAX_TITLE_LENGTH)} characters.`,
  },
  { field: 'slug', valid: isSlug, message: 'slug must be lowercase letters, numbers and hyphens.' },
  { field: 'slug', valid: (value) => !RESERVED_SLUGS.includes(String(value)), message: 'That slug is reserved.' },
  {
    field: 'excerpt',
    valid: isTextUpTo(MAX_EXCERPT_LENGTH),
    message: `excerpt must be text of up to ${String(MAX_EXCERPT_LENGTH)} characters.`,
  },
  {
    field: 'body',
    valid: isTextUpTo(MAX_BODY_LENGTH),
    message: `body must be text of up to ${String(MAX_BODY_LENGTH)} characters.`,
  },
  { field: 'cover_image_url', valid: isHttpUrl, message: 'cover_image_url must be an http(s) URL.' },
  {
    field: 'related_sandwich_slugs',
    valid: isSlugList(MAX_RELATED_SANDWICHES),
    message: `related_sandwich_slugs must be a list of up to ${String(MAX_RELATED_SANDWICHES)} lowercase slugs.`,
  },
  {
    field: 'meta_description',
    valid: isNullableTextUpTo(MAX_META_DESCRIPTION_LENGTH),
    message: `meta_description must be text of up to ${String(MAX_META_DESCRIPTION_LENGTH)} characters.`,
  },
  {
    field: 'author_name',
    valid: isTrimmedLengthBetween1And(MAX_AUTHOR_NAME_LENGTH),
    message: `author_name must be 1-${String(MAX_AUTHOR_NAME_LENGTH)} characters.`,
  },
  { field: 'published', valid: (value) => typeof value === 'boolean', message: 'published must be true or false.' },
  { field: 'published_at', valid: isDateTime, message: 'published_at must be a date and time.' },
  {
    field: 'category_slugs',
    valid: isSlugList(MAX_CATEGORIES),
    message: `category_slugs must be a list of up to ${String(MAX_CATEGORIES)} category slugs.`,
  },
]

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const TRIMMED_FIELDS = ['title', 'author_name']

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const validate = (input: Record<string, unknown>, mode: Mode): ParseResult => {
  const provided = CHECKS.filter(({ field }) => input[field] !== undefined)
  const failing = provided.find(({ field, valid }) => !valid(input[field]))
  if (failing !== undefined) return { ok: false, message: failing.message }

  if (mode === 'update' && provided.length === 0) {
    return { ok: false, message: 'Request body must contain at least one editable field.' }
  }

  const fields = [...new Set(provided.map(({ field }) => field))].filter((field) => field !== 'category_slugs')
  const columns = fields.map((field): [string, unknown] => [field, TRIMMED_FIELDS.includes(field) ? trimmed(input[field]) : input[field]])
  const readingTime = typeof input.body === 'string' ? { reading_time_minutes: readingTimeMinutes(input.body) } : {}
  const value = { ...Object.fromEntries(columns), ...readingTime }

  return isStringList(input.category_slugs) ? { ok: true, value, categorySlugs: input.category_slugs } : { ok: true, value }
}

const parseCreate = (input: Record<string, unknown>): ParseResult => {
  if (input.title === undefined) return { ok: false, message: 'title is required.' }

  const titleCheck = CHECKS.find(({ field }) => field === 'title')
  if (titleCheck !== undefined && !titleCheck.valid(input.title)) return { ok: false, message: titleCheck.message }

  const slug = input.slug === undefined ? slugify(trimmed(input.title)) : input.slug
  if (slug === '') return { ok: false, message: 'slug could not be created from the title; provide one.' }

  return validate({ ...input, slug }, 'create')
}

export const parseBlogPostInput = (body: unknown, mode: Mode): ParseResult => {
  const input = isPlainObject(body) ? body : {}
  return mode === 'create' ? parseCreate(input) : validate(input, 'update')
}
