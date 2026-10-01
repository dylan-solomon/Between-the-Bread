import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { err } from './_lib/response.js'
import { setPublicCache } from './_lib/publicCache.js'
import { SITE_URL } from './_lib/siteUrl.js'

type SitemapUrl = {
  path: string
  lastmod?: string
  changefreq: 'weekly' | 'monthly'
  priority: string
}

const STATIC_URLS: SitemapUrl[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/sandwiches', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
]

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

const escapeXml = (value: string): string => value.replace(/[&<>"']/g, (character) => ESCAPES[character])

const renderUrl = ({ path, lastmod, changefreq, priority }: SitemapUrl): string =>
  [
    '  <url>',
    `    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>`,
    ...(lastmod === undefined ? [] : [`    <lastmod>${lastmod}</lastmod>`]),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')

const renderSitemap = (urls: SitemapUrl[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n')

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { data, error } = await supabase
    .from('sandwich_database')
    .select('slug, updated_at')
    .eq('published', true)
    .order('slug')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to build sitemap.', 500))
    return
  }

  const entries: SitemapUrl[] = (data as { slug: string; updated_at: string }[]).map((entry) => ({
    path: `/sandwiches/${entry.slug}`,
    lastmod: entry.updated_at.slice(0, 10),
    changefreq: 'monthly',
    priority: '0.6',
  }))

  setPublicCache(res)
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.status(200).send(renderSitemap([...STATIC_URLS, ...entries]))
}
