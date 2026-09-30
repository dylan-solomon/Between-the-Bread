import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'
import { isRegion } from './_lib/regions.js'

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 50
const LIST_COLUMNS =
  'name, slug, description, origin_country, origin_region, image_url, avg_rating, rating_count, dietary_tags, canonical_ingredients'

const SORTS = ['name', 'rating', 'newest'] as const
type Sort = (typeof SORTS)[number]

const isSort = (value: string): value is Sort => (SORTS as readonly string[]).includes(value)

const firstString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseInteger = (value: string | undefined, fallback: number): number | null => {
  if (value === undefined) return fallback
  return /^\d+$/.test(value) ? Number(value) : null
}

const invalid = (res: VercelResponse, message: string): void => {
  res.status(400).json(err('INVALID_INPUT', message, 400))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const limit = parseInteger(firstString(req.query.limit), DEFAULT_LIMIT)
  if (limit === null || limit < 1 || limit > MAX_LIMIT) {
    invalid(res, `limit must be an integer between 1 and ${String(MAX_LIMIT)}.`)
    return
  }

  const offset = parseInteger(firstString(req.query.offset), 0)
  if (offset === null) {
    invalid(res, 'offset must be a non-negative integer.')
    return
  }

  const region = firstString(req.query.region)
  if (region !== undefined && !isRegion(region)) {
    invalid(res, 'region is not a recognised region.')
    return
  }

  const sort = firstString(req.query.sort) ?? 'name'
  if (!isSort(sort)) {
    invalid(res, 'sort must be one of: name, rating, newest.')
    return
  }

  const country = firstString(req.query.country)
  const search = firstString(req.query.q)?.trim()
  const dietTags = (firstString(req.query.diet) ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const base = supabase.from('sandwich_database').select(LIST_COLUMNS, { count: 'exact' })
  const filtered = [
    (query: typeof base) => (region === undefined ? query : query.eq('origin_region', region)),
    (query: typeof base) => (country === undefined ? query : query.eq('origin_country', country)),
    (query: typeof base) => (dietTags.length === 0 ? query : query.contains('dietary_tags', dietTags)),
    (query: typeof base) =>
      search === undefined || search === ''
        ? query
        : query.textSearch('search_vector', search, { type: 'websearch', config: 'english' }),
  ].reduce((query, apply) => apply(query), base)

  const sorted =
    sort === 'rating'
      ? filtered
          .order('avg_rating', { ascending: false, nullsFirst: false })
          .order('rating_count', { ascending: false })
      : sort === 'newest'
        ? filtered.order('created_at', { ascending: false })
        : filtered.order('name', { ascending: true })

  const { data, count, error } = await sorted.range(offset, offset + limit - 1)

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch sandwiches.', 500))
    return
  }

  res.status(200).json(ok(data, { total_count: count ?? 0, limit, offset }))
}
