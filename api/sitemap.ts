import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { err } from './_lib/response.js'
import { setPublicCache } from './_lib/publicCache.js'
import { SITE_URL } from './_lib/siteUrl.js'
import { escapeXml } from './_lib/xml.js'
import { nowIso } from './_lib/blogPublic.js'

type SitemapUrl = {
  path: string
  lastmod?: string
  changefreq: 'weekly' | 'monthly'
  priority: string
}

type BlogPostRow = {
  slug: string
  updated_at: string
  blog_post_categories: { blog_categories: { slug: string } }[]
}

const isBlogPostRow = (value: unknown): value is BlogPostRow =>
  typeof value === 'object' && value !== null && 'slug' in value && 'blog_post_categories' in value

const categoryUrls = (posts: BlogPostRow[]): SitemapUrl[] => {
  const latest = posts
    .flatMap((post) => post.blog_post_categories.map((link) => ({ slug: link.blog_categories.slug, updatedAt: post.updated_at })))
    .reduce((byCategory, { slug, updatedAt }) => {
      const current = byCategory.get(slug)
      return new Map(byCategory).set(slug, current === undefined || updatedAt > current ? updatedAt : current)
    }, new Map<string, string>())

  return [...latest.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, updatedAt]) => ({
      path: `/blog/category/${slug}`,
      lastmod: updatedAt.slice(0, 10),
      changefreq: 'weekly',
      priority: '0.6',
    }))
}

const STATIC_URLS: SitemapUrl[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/sandwiches', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
]

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

  const [sandwiches, blog] = await Promise.all([
    supabase.from('sandwich_database').select('slug, updated_at').eq('published', true).order('slug'),
    supabase
      .from('blog_posts')
      .select('slug, updated_at, blog_post_categories(blog_categories(slug))')
      .eq('published', true)
      .lte('published_at', nowIso())
      .order('slug'),
  ])

  if (sandwiches.error !== null || blog.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to build sitemap.', 500))
    return
  }

  const entries: SitemapUrl[] = (sandwiches.data as { slug: string; updated_at: string }[]).map((entry) => ({
    path: `/sandwiches/${entry.slug}`,
    lastmod: entry.updated_at.slice(0, 10),
    changefreq: 'monthly',
    priority: '0.6',
  }))

  const posts = (blog.data as unknown[]).filter(isBlogPostRow)
  const postUrls: SitemapUrl[] = posts.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: post.updated_at.slice(0, 10),
    changefreq: 'monthly',
    priority: '0.7',
  }))

  setPublicCache(res)
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.status(200).send(renderSitemap([...STATIC_URLS, ...entries, ...postUrls, ...categoryUrls(posts)]))
}
