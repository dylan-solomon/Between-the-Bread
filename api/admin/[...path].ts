import type { VercelRequest, VercelResponse } from '@vercel/node'
import { err } from '../_lib/response.js'
import { authenticateAdminRequest } from '../_lib/adminAuth.js'
import configHandler from './_handlers/config.js'
import ingredientsHandler from './_handlers/ingredients.js'
import compatMatrixHandler from './_handlers/compatMatrix.js'
import moderationHandler from './_handlers/moderation.js'
import dashboardHandler from './_handlers/dashboard.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  const { supabase } = auth
  const { path } = req.query as { path?: string[] }
  const segments = path ?? []
  const [resource, second, third] = segments

  if (resource === 'config' && segments.length === 1) {
    await configHandler(req, res, supabase)
    return
  }

  if (resource === 'ingredients' && segments.length <= 2) {
    await ingredientsHandler(req, res, supabase, second)
    return
  }

  if (resource === 'compat-matrix' && segments.length === 1) {
    await compatMatrixHandler(req, res, supabase)
    return
  }

  if (resource === 'moderation' && segments.length >= 2 && segments.length <= 3) {
    await moderationHandler(req, res, supabase, second, third)
    return
  }

  if (resource === 'dashboard' && segments.length === 1) {
    await dashboardHandler(req, res, supabase)
    return
  }

  res.status(404).json(err('NOT_FOUND', 'Route not found.', 404))
}
