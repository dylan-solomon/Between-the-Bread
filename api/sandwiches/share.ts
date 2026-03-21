import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { generateHash } from '../_lib/hash.js'
import { checkShareRateLimit } from '../_lib/rateLimit.js'

const REQUIRED_CATEGORIES = ['bread', 'protein', 'cheese', 'toppings', 'condiments'] as const

type Composition = Record<string, unknown[]>

const isValidComposition = (composition: unknown): composition is Composition => {
  if (typeof composition !== 'object' || composition === null) return false
  return REQUIRED_CATEGORIES.every(
    (cat) =>
      cat in (composition as Record<string, unknown>) &&
      Array.isArray((composition as Record<string, unknown>)[cat]),
  )
}

const buildShareUrl = (hash: string): string => {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'betweenbread.co'
  const base = host.startsWith('http') ? host : `https://${host}`
  return `${base}/s/${hash}`
}

const ninetyDaysFromNow = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + 90)
  return date.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const forwarded = req.headers['x-forwarded-for']
  const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null

  const rateCheck = await checkShareRateLimit(clientIp)
  if (!rateCheck.allowed) {
    res.status(429).json(err('RATE_LIMITED', 'Too many share requests. Please try again later.', 429))
    return
  }

  const { composition, name } = req.body as { composition?: unknown; name?: unknown }

  if (!isValidComposition(composition)) {
    res.status(400).json(err('INVALID_COMPOSITION', 'Composition must include all required categories.', 400))
    return
  }

  if (typeof name !== 'string' || name.trim() === '') {
    res.status(400).json(err('INVALID_NAME', 'Name is required.', 400))
    return
  }

  const hash = generateHash()

  const { data, error } = await supabase
    .from('shared_sandwiches')
    .insert({ hash, composition, name: name.trim(), expires_at: ninetyDaysFromNow(), created_by_ip: clientIp })
    .select('hash')
    .single()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to save sandwich.', 500))
    return
  }

  const url = buildShareUrl((data as { hash: string }).hash)
  res.status(201).json(ok({ hash: (data as { hash: string }).hash, url }))
}
