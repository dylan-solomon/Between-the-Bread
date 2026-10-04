import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'
import { setPublicCache } from './_lib/publicCache.js'
import { isAvoidTag, isDietaryTag } from './_lib/dietaryTags.js'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 100
const SEARCHES_PER_MINUTE = 30
const SOURCES = ['all', 'database', 'community', 'blog', 'saved'] as const

type Source = (typeof SOURCES)[number]
type PublicSource = 'database' | 'community' | 'blog'
type Hit = { source: string; slug: string; title: string; score: number; details: unknown }
type Counts = Record<PublicSource, number>
type Saved = { results: Hit[]; count: number } | null

const firstString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseInteger = (value: string | undefined, fallback: number): number | null => {
  if (value === undefined) return fallback
  return /^\d+$/.test(value) ? Number(value) : null
}

const clientIp = (req: VercelRequest): string => {
  const forwarded = req.headers['x-forwarded-for']
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined
  return first === undefined || first === '' ? 'unknown' : first
}

const withinRateLimit = async (req: VercelRequest): Promise<boolean> => {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return true
  const response = await createClient(url, serviceKey).rpc('hit_rate_limit', {
    p_bucket: 'search',
    p_subject: clientIp(req),
    p_limit: SEARCHES_PER_MINUTE,
    p_window_seconds: 60,
  })
  return response.error !== null || response.data !== false
}

const isSource = (value: string): value is Source => (SOURCES as readonly string[]).includes(value)

const invalid = (res: VercelResponse, message: string): void => {
  res.status(400).json(err('INVALID_INPUT', message, 400))
}

const isHit = (value: unknown): value is Hit =>
  typeof value === 'object' &&
  value !== null &&
  'source' in value &&
  'slug' in value &&
  'title' in value &&
  'score' in value &&
  typeof value.score === 'number'

const hitsOf = (value: unknown): Hit[] =>
  Array.isArray(value) ? (value as unknown[]).filter(isHit) : []

const numberOf = (value: unknown): number => (typeof value === 'number' ? value : 0)

const parsePublic = (value: unknown): { results: Hit[]; counts: Counts } | null => {
  if (typeof value !== 'object' || value === null || !('results' in value) || !('counts' in value))
    return null
  const counts = value.counts
  if (typeof counts !== 'object' || counts === null) return null
  return {
    results: hitsOf(value.results),
    counts: {
      database: numberOf('database' in counts ? counts.database : 0),
      community: numberOf('community' in counts ? counts.community : 0),
      blog: numberOf('blog' in counts ? counts.blog : 0),
    },
  }
}

const parseSaved = (value: unknown): Saved => {
  if (typeof value !== 'object' || value === null || !('results' in value)) return null
  return { results: hitsOf(value.results), count: numberOf('count' in value ? value.count : 0) }
}

const byRelevance = (a: Hit, b: Hit): number => b.score - a.score || a.title.localeCompare(b.title)

const withoutScore = (hit: Hit): Omit<Hit, 'score'> => ({
  source: hit.source,
  slug: hit.slug,
  title: hit.title,
  details: hit.details,
})

const searchSaved = async (
  authorization: string,
  query: string,
  limit: number,
  offset: number,
): Promise<Saved> => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  const client = createClient(url, key, { global: { headers: { Authorization: authorization } } })
  const response = await client.rpc('search_saved', {
    p_query: query,
    p_limit: limit,
    p_offset: offset,
  })
  return response.error === null ? parseSaved(response.data as unknown) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const query = (firstString(req.query.q) ?? '').trim()
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    invalid(res, `q must be ${String(MIN_QUERY_LENGTH)} to ${String(MAX_QUERY_LENGTH)} characters.`)
    return
  }

  const source = firstString(req.query.source) ?? 'all'
  if (!isSource(source)) {
    invalid(res, `source must be one of: ${SOURCES.join(', ')}.`)
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

  const dietTags = (firstString(req.query.diet) ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (!dietTags.every(isDietaryTag)) {
    invalid(res, 'diet contains an unsupported dietary tag.')
    return
  }

  if (!(await withinRateLimit(req))) {
    res
      .status(429)
      .json(err('RATE_LIMITED', "You're searching very quickly. Please wait a moment.", 429))
    return
  }

  const authorization = req.headers.authorization
  const signedIn = typeof authorization === 'string' && authorization.startsWith('Bearer ')
  if (source === 'saved' && !signedIn) {
    res.status(401).json(err('AUTH_REQUIRED', 'Sign in to search your history.', 401))
    return
  }

  const merging = source === 'all'
  const publicPage =
    source === 'saved'
      ? { limit: 0, offset: 0 }
      : merging
        ? { limit: offset + limit, offset: 0 }
        : { limit, offset }
  const savedPage =
    source === 'saved'
      ? { limit, offset }
      : merging
        ? { limit: offset + limit, offset: 0 }
        : { limit: 0, offset: 0 }
  const searchHistory = signedIn && dietTags.length === 0

  const [publicResponse, saved] = await Promise.all([
    supabase.rpc('search_public', {
      p_query: query,
      p_source: source === 'saved' ? 'all' : source,
      p_require: dietTags.filter((tag) => !isAvoidTag(tag)),
      p_avoid: dietTags.filter(isAvoidTag),
      p_limit: publicPage.limit,
      p_offset: publicPage.offset,
    }),
    searchHistory
      ? searchSaved(authorization, query, savedPage.limit, savedPage.offset)
      : Promise.resolve(null),
  ])

  const found = publicResponse.error === null ? parsePublic(publicResponse.data as unknown) : null
  if (found === null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to search.', 500))
    return
  }

  const savedCount = !signedIn ? null : dietTags.length > 0 ? 0 : (saved?.count ?? null)
  const counts = { ...found.counts, saved: savedCount }
  const results =
    source === 'saved'
      ? (saved?.results ?? [])
      : merging
        ? [...found.results, ...(saved?.results ?? [])]
            .sort(byRelevance)
            .slice(offset, offset + limit)
        : found.results
  const totalCount =
    source === 'all'
      ? found.counts.database + found.counts.community + found.counts.blog + (savedCount ?? 0)
      : source === 'saved'
        ? (savedCount ?? 0)
        : found.counts[source]

  if (signedIn) res.setHeader('Cache-Control', 'private, no-store')
  else setPublicCache(res)
  res
    .status(200)
    .json(ok(results.map(withoutScore), { counts, total_count: totalCount, limit, offset }))
}
