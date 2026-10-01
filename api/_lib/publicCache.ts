import type { VercelResponse } from '@vercel/node'

export const setPublicCache = (res: VercelResponse): void => {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
}
