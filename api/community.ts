import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'
import { setPublicCache } from './_lib/publicCache.js'
import { isAvoidTag, isDietaryTag } from './_lib/dietaryTags.js'
import { isSlug } from './_lib/slug.js'

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 50
const SORTS = ['top_rated', 'most_popular', 'trending', 'newest'] as const

const firstString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const parseInteger = (value: string | undefined, fallback: number): number | null => {
  if (value === undefined) return fallback
  return /^\d+$/.test(value) ? Number(value) : null
}

const invalid = (res: VercelResponse, message: string): void => {
  res.status(400).json(err('INVALID_INPUT', message, 400))
}

const isRow = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const totalOf = (rows: Record<string, unknown>[]): number => {
  const total = rows[0]?.total_count
  return typeof total === 'number' ? total : 0
}

const withoutTotal = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'total_count'))

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const sort = firstString(req.query.sort) ?? 'most_popular'
  if (!(SORTS as readonly string[]).includes(sort)) {
    invalid(res, `sort must be one of: ${SORTS.join(', ')}.`)
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

  const ingredient = firstString(req.query.ingredient)
  if (ingredient !== undefined && !isSlug(ingredient)) {
    invalid(res, 'ingredient must be an ingredient slug.')
    return
  }

  const response = await supabase.rpc('community_leaderboard', {
    p_sort: sort,
    p_require: dietTags.filter((tag) => !isAvoidTag(tag)),
    p_avoid: dietTags.filter(isAvoidTag),
    p_ingredient: ingredient ?? null,
    p_limit: limit,
    p_offset: offset,
  })
  const data: unknown = response.data
  if (response.error !== null || !Array.isArray(data)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch the leaderboard.', 500))
    return
  }

  const rows = (data as unknown[]).filter(isRow)
  setPublicCache(res)
  res.status(200).json(ok(rows.map(withoutTotal), { total_count: totalOf(rows), limit, offset }))
}
