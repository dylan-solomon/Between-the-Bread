import { supabase } from './supabase.js'

const MAX_SHARES_PER_WINDOW = 10
const WINDOW_MINUTES = 15

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export const checkShareRateLimit = async (ip: string | null): Promise<RateLimitResult> => {
  if (ip === null) return { allowed: true }

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('shared_sandwiches')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_ip', ip)
    .gte('created_at', windowStart)

  if (error !== null) return { allowed: true }

  if ((count ?? 0) >= MAX_SHARES_PER_WINDOW) {
    return { allowed: false, retryAfterSeconds: WINDOW_MINUTES * 60 }
  }

  return { allowed: true }
}
