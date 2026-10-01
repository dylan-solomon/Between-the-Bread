import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { err } from '../_lib/response.js'
import { setPublicCache } from '../_lib/publicCache.js'
import { SITE_URL } from '../_lib/siteUrl.js'
import { escapeXml } from '../_lib/xml.js'
import { isPostRow, withCategories } from '../_lib/blogPostColumns.js'
import { LIST_POST_COLUMNS, nowIso } from '../_lib/blogPublic.js'

const FEED_LIMIT = 20
const FEED_TITLE = 'Between the Bread Blog'
const FEED_DESCRIPTION = 'Sandwich stories, guides and ideas from Between the Bread.'

type FeedPost = {
  slug: string
  title: string
  excerpt: string
  author_name: string
  published_at: string
  categories: { name: string }[]
}

const isFeedPost = (value: Record<string, unknown>): value is Record<string, unknown> & FeedPost =>
  typeof value.slug === 'string' && typeof value.title === 'string' && typeof value.published_at === 'string'

const rfc822 = (iso: string): string => new Date(iso).toUTCString()

const renderItem = (post: FeedPost): string => {
  const link = `${SITE_URL}/blog/${post.slug}`
  return [
    '    <item>',
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <pubDate>${rfc822(post.published_at)}</pubDate>`,
    `      <description>${escapeXml(post.excerpt)}</description>`,
    ...post.categories.map((category) => `      <category>${escapeXml(category.name)}</category>`),
    `      <dc:creator>${escapeXml(post.author_name)}</dc:creator>`,
    '    </item>',
  ].join('\n')
}

const renderFeed = (posts: FeedPost[]): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${FEED_TITLE}</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    `    <description>${FEED_DESCRIPTION}</description>`,
    '    <language>en-us</language>',
    `    <lastBuildDate>${rfc822(posts.length === 0 ? nowIso() : posts[0].published_at)}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>`,
    ...posts.map(renderItem),
    '  </channel>',
    '</rss>',
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
    .from('blog_posts')
    .select(LIST_POST_COLUMNS)
    .eq('published', true)
    .lte('published_at', nowIso())
    .order('published_at', { ascending: false })
    .limit(FEED_LIMIT)

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to build feed.', 500))
    return
  }

  const posts = (data as unknown[]).filter(isPostRow).map(withCategories).filter(isFeedPost)

  setPublicCache(res)
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.status(200).send(renderFeed(posts))
}
