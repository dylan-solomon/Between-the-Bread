import { next } from '@vercel/edge'
import { isBlogPost } from './src/api/blog'
import { scriptJson } from './src/seo/scriptJson'
import { blogPostPage } from './edge/blogPostPage'
import {
  canonicalTag,
  descriptionTag,
  metaTag,
  structuredDataTag,
  titleTag,
  twitterTags,
} from './edge/html'
import type { Page } from './edge/page'
import { siteShell } from './edge/shell'

const SHARE_PATTERN = /^\/s\/([a-zA-Z0-9]{8})$/
const SANDWICH_PATTERN = /^\/sandwiches\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const BLOG_POST_PATTERN = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const BLOG_CATEGORY_PATTERN = /^\/blog\/category\/([a-z0-9]+(?:-[a-z0-9]+)*)$/

type ShareApiResponse = {
  data: { hash: string; name: string }
}

type SandwichApiResponse = {
  data: { name: string; slug: string; description: string | null; image_url: string | null }
}

type BlogCategoriesApiResponse = {
  data: { slug: string; name: string; description: string | null; post_count: number }[]
}

const SHELL_SHARE_TAGS =
  /<title>[^<]*<\/title>\s*|<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g
const SHELL_DESCRIPTION = /<meta\s+name="description"[^>]*>\s*/g
const EMPTY_ROOT = '<div id="root"></div>'

const searchTags = (search: NonNullable<Page['search']>): string[] => [
  descriptionTag(search.description),
  canonicalTag(search.canonical),
  ...(search.structuredData === undefined ? [] : [structuredDataTag(search.structuredData)]),
]

const withContent = (html: string, content: Page['content']): string =>
  content === undefined
    ? html
    : html.replace(
        EMPTY_ROOT,
        `<div id="root">${siteShell(content.html)}</div>\n    <script type="application/json" id="initial-data">${scriptJson({ path: content.path, data: content.data })}</script>`,
      )

const respond = async (url: URL, page: Page): Promise<Response> => {
  const htmlRes = await fetch(new URL('/', url).toString())
  const shell = (await htmlRes.text()).replace(SHELL_SHARE_TAGS, '')
  const html = page.search === undefined ? shell : shell.replace(SHELL_DESCRIPTION, '')
  const tags = [...page.tags, ...(page.search === undefined ? [] : searchTags(page.search))]
  const injected = withContent(
    html.replace('<head>', `<head>\n    ${tags.join('\n    ')}`),
    page.content,
  )

  return new Response(injected, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

const shareTags = async (url: URL, hash: string): Promise<Page | null> => {
  const apiRes = await fetch(`${url.origin}/api/sandwiches/share/${hash}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as ShareApiResponse
  const image = `${url.origin}/api/og/sandwich/${hash}`

  return {
    tags: [
      titleTag(`${data.name} | Between the Bread`),
      metaTag('og:title', data.name),
      metaTag('og:url', `${url.origin}/s/${hash}`),
      metaTag('og:type', 'website'),
      metaTag('og:image', image),
      metaTag('og:image:width', '1200'),
      metaTag('og:image:height', '630'),
      ...twitterTags({ title: data.name, description: null, image }),
    ],
  }
}

const sandwichTags = async (url: URL, slug: string): Promise<Page | null> => {
  const apiRes = await fetch(`${url.origin}/api/database/${slug}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as SandwichApiResponse

  return {
    tags: [
      titleTag(`${data.name} | Between the Bread`),
      metaTag('og:title', data.name),
      ...(data.description === null ? [] : [metaTag('og:description', data.description)]),
      ...(data.image_url === null ? [] : [metaTag('og:image', data.image_url)]),
      metaTag('og:url', `${url.origin}/sandwiches/${slug}`),
      metaTag('og:type', 'article'),
      ...twitterTags({ title: data.name, description: data.description, image: data.image_url }),
    ],
  }
}

const blogPostPageFor = async (url: URL, slug: string): Promise<Page | null> => {
  const apiRes = await fetch(`${url.origin}/api/blog/${slug}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as { data: unknown }
  return isBlogPost(data) ? blogPostPage({ post: data, origin: url.origin }) : null
}

const blogCategoryTags = async (url: URL, slug: string): Promise<Page | null> => {
  const apiRes = await fetch(`${url.origin}/api/blog/categories`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as BlogCategoriesApiResponse
  const category = data.find((candidate) => candidate.slug === slug && candidate.post_count > 0)
  if (category === undefined) return null

  const title = `${category.name} | Blog | Between the Bread`
  const description = category.description ?? `${category.name} posts from Between the Bread.`

  return {
    tags: [
      titleTag(title),
      metaTag('og:title', title),
      metaTag('og:description', description),
      metaTag('og:url', `${url.origin}/blog/category/${slug}`),
      metaTag('og:type', 'website'),
      ...twitterTags({ title, description, image: null }),
    ],
  }
}

const ROUTES: { pattern: RegExp; tags: (url: URL, key: string) => Promise<Page | null> }[] = [
  { pattern: SHARE_PATTERN, tags: shareTags },
  { pattern: SANDWICH_PATTERN, tags: sandwichTags },
  { pattern: BLOG_CATEGORY_PATTERN, tags: blogCategoryTags },
  { pattern: BLOG_POST_PATTERN, tags: blogPostPageFor },
]

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)

  try {
    const matches = ROUTES.flatMap(({ pattern, tags }) => {
      const match = pattern.exec(url.pathname)
      return match === null ? [] : [{ tags, key: match[1] }]
    })
    const page = matches.length === 0 ? null : await matches[0].tags(url, matches[0].key)

    return page === null ? next() : await respond(url, page)
  } catch {
    return next()
  }
}

export const config = {
  matcher: ['/s/:hash*', '/sandwiches/:slug', '/blog/:slug', '/blog/category/:slug'],
}
