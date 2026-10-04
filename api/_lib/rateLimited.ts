import type { VercelResponse } from '@vercel/node'
import { err } from './response.js'

const RATE_LIMITED_CODE = 'P0429'

export const isRateLimited = (error: { code?: string } | null): boolean => error?.code === RATE_LIMITED_CODE

export const respondRateLimited = (res: VercelResponse, message: string): void => {
  res.status(429).json(err('RATE_LIMITED', message, 429))
}
