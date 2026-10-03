import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ok, err } from '../_lib/response.js'
import { isUsernameFormat } from '../_lib/username.js'

const MAX_ATTEMPTS = 10
const WINDOW_MINUTES = 15

const invalid = (res: VercelResponse): void => {
  res.status(401).json(err('INVALID_CREDENTIALS', 'Incorrect username or password.', 401))
}

const clientIp = (req: VercelRequest): string => {
  const forwarded = req.headers['x-forwarded-for']
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined
  return first === undefined || first === '' ? 'unknown' : first
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing Supabase configuration.', 500))
    return
  }

  const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown }
  if (!isUsernameFormat(username) || typeof password !== 'string' || password === '') {
    invalid(res)
    return
  }

  const admin = createClient(url, serviceRoleKey)

  const attempts: unknown = (
    await admin.rpc('record_login_attempt', { p_ip: clientIp(req), p_window_minutes: WINDOW_MINUTES })
  ).data
  if (typeof attempts === 'number' && attempts > MAX_ATTEMPTS) {
    res.status(429).json(err('TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Please try again in 15 minutes.', 429))
    return
  }

  const userId: unknown = (await admin.rpc('user_id_for_username', { p_username: username })).data
  if (typeof userId !== 'string') {
    invalid(res)
    return
  }

  const { data: found } = await admin.auth.admin.getUserById(userId)
  const email = found.user?.email
  if (email === undefined || email === '') {
    invalid(res)
    return
  }

  const { data, error } = await createClient(url, anonKey).auth.signInWithPassword({ email, password })
  if (error !== null) {
    invalid(res)
    return
  }

  res.status(200).json(ok({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }))
}
