import { next } from '@vercel/edge'
import { isBlogPost } from './src/api/blog'
import type { BlogCategory, BlogListing } from './src/api/blog'
import { isCommunitySandwich } from './src/api/community'
import type { CommunitySandwichSummary } from './src/api/community'
import { isSandwichEntry } from './src/api/database'
import type { SandwichSummary } from './src/api/database'
import { scriptJson } from './src/seo/scriptJson'
import { blogPostPage } from './edge/blogPostPage'
import { sandwichEntryPage } from './edge/sandwichEntryPage'
import { blogCategoryPage, blogIndexPage, encyclopediaPage } from './edge/listPages'
import { communityIndexPage, communitySandwichPage } from './edge/communityPages'
import {
  canonicalTag,
  descriptionTag,
  metaTag,
  robotsNoindexTag,
  structuredDataTag,
  titleTag,
  twitterTags,
} from './edge/html'
import type { Page } from './edge/page'
import { siteShell } from './edge/shell'

const SHARE_PATTERN = /^\/s\/([a-zA-Z0-9]{8})$/
const ENCYCLOPEDIA_PATTERN = /^\/sandwiches$/
const BLOG_INDEX_PATTERN = /^\/blog$/
const COMMUNITY_INDEX_PATTERN = /^\/community$/
const COMMUNITY_PATTERN = /^\/community\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const SANDWICH_PATTERN = /^\/sandwiches\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const BLOG_POST_PATTERN = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
const BLOG_CATEGORY_PATTERN = /^\/blog\/category\/([a-z0-9]+(?:-[a-z0-9]+)*)$/

type ShareApiResponse = {
  data: { hash: string; name: string }
}

type ListResponse<T> = { data: T[]; meta: { total_count: number } }

const ENCYCLOPEDIA_FILTERS = ['q', 'region', 'sort', 'diet']
const COMMUNITY_FILTERS = ['sort', 'diet', 'ingredient']
const ENCYCLOPEDIA_PAGE_SIZE = 24
const BLOG_PAGE_SIZE = 12

const SHELL_SHARE_TAGS =
  /<title>[^<]*<\/title>\s*|<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g
const SHELL_DESCRIPTION = /<meta\s+name="description"[^>]*>\s*/g
const EMPTY_ROOT = '<div id="root"></div>'
const NOT_FOUND = 'not-found'

type Outcome = Page | typeof NOT_FOUND | null

const searchTags = (search: NonNullable<Page['search']>): string[] => [
  descriptionTag(search.description),
  canonicalTag(search.canonical),
  ...(search.structuredData === undefined ? [] : [structuredDataTag(search.structuredData)]),
  ...(search.noindex === true ? [robotsNoindexTag] : []),
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

const respondNotFound = async (url: URL): Promise<Response> => {
  const htmlRes = await fetch(new URL('/', url).toString())
  const html = (await htmlRes.text()).replace(
    '<head>',
    '<head>\n    <meta name="robots" content="noindex" />',
  )

  return new Response(html, {
    status: 404,
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

const sandwichPageFor = async (url: URL, slug: string): Promise<Outcome> => {
  const apiRes = await fetch(`${url.origin}/api/database/${slug}`)
  if (apiRes.status === 404) return NOT_FOUND
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as { data: unknown }
  return isSandwichEntry(data) ? sandwichEntryPage({ entry: data, origin: url.origin }) : null
}

const blogPostPageFor = async (url: URL, slug: string): Promise<Outcome> => {
  const apiRes = await fetch(`${url.origin}/api/blog/${slug}`)
  if (apiRes.status === 404) return NOT_FOUND
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as { data: unknown }
  return isBlogPost(data) ? blogPostPage({ post: data, origin: url.origin }) : null
}

const fetchJson = async (url: string): Promise<unknown> => {
  const apiRes = await fetch(url)
  return apiRes.ok ? apiRes.json() : null
}

const isList = <T>(value: unknown): value is ListResponse<T> =>
  typeof value === 'object' &&
  value !== null &&
  'data' in value &&
  Array.isArray(value.data) &&
  'meta' in value &&
  typeof value.meta === 'object' &&
  value.meta !== null &&
  'total_count' in value.meta &&
  typeof value.meta.total_count === 'number'

const isCategoryList = (value: unknown): value is { data: BlogCategory[] } =>
  typeof value === 'object' && value !== null && 'data' in value && Array.isArray(value.data)

const encyclopediaPageFor = async (url: URL): Promise<Page | null> => {
  if (ENCYCLOPEDIA_FILTERS.some((filter) => url.searchParams.has(filter))) return null

  const body = await fetchJson(
    `${url.origin}/api/database?limit=${String(ENCYCLOPEDIA_PAGE_SIZE)}&offset=0`,
  )
  if (!isList<SandwichSummary>(body)) return null

  return encyclopediaPage({
    page: { items: body.data, totalCount: body.meta.total_count },
    origin: url.origin,
  })
}

const communityIndexPageFor = async (url: URL): Promise<Outcome> => {
  if (COMMUNITY_FILTERS.some((filter) => url.searchParams.has(filter))) return null

  const body = await fetchJson(
    `${url.origin}/api/community?limit=${String(ENCYCLOPEDIA_PAGE_SIZE)}&offset=0`,
  )
  if (!isList<CommunitySandwichSummary>(body)) return null

  return communityIndexPage({
    page: { items: body.data, totalCount: body.meta.total_count },
    origin: url.origin,
  })
}

const communitySandwichPageFor = async (url: URL, slug: string): Promise<Outcome> => {
  const apiRes = await fetch(`${url.origin}/api/community/${slug}`)
  if (apiRes.status === 404) return NOT_FOUND
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as { data: unknown }
  return isCommunitySandwich(data)
    ? communitySandwichPage({ sandwich: data, origin: url.origin })
    : null
}

const blogListing = async (url: URL, category?: string): Promise<BlogListing | null> => {
  const query = new URLSearchParams({
    ...(category === undefined ? {} : { category }),
    limit: String(BLOG_PAGE_SIZE),
    offset: '0',
  })
  const [categories, posts] = await Promise.all([
    fetchJson(`${url.origin}/api/blog/categories`),
    fetchJson(`${url.origin}/api/blog?${query.toString()}`),
  ])
  if (!isCategoryList(categories) || !isList<BlogListing['posts']['items'][number]>(posts))
    return null

  return {
    categories: categories.data,
    posts: { items: posts.data, totalCount: posts.meta.total_count },
  }
}

const blogIndexPageFor = async (url: URL): Promise<Page | null> => {
  const listing = await blogListing(url)
  return listing === null ? null : blogIndexPage({ listing, origin: url.origin })
}

const blogCategoryPageFor = async (url: URL, slug: string): Promise<Outcome> => {
  const listing = await blogListing(url, slug)
  if (listing === null) return null
  const category = listing.categories.find(
    (candidate) => candidate.slug === slug && candidate.post_count > 0,
  )
  if (category === undefined) return NOT_FOUND

  return blogCategoryPage({ category, listing, origin: url.origin })
}

const ROUTES: { pattern: RegExp; load: (url: URL, key: string) => Promise<Outcome> }[] = [
  { pattern: SHARE_PATTERN, load: shareTags },
  { pattern: ENCYCLOPEDIA_PATTERN, load: encyclopediaPageFor },
  { pattern: SANDWICH_PATTERN, load: sandwichPageFor },
  { pattern: BLOG_INDEX_PATTERN, load: blogIndexPageFor },
  { pattern: COMMUNITY_INDEX_PATTERN, load: communityIndexPageFor },
  { pattern: COMMUNITY_PATTERN, load: communitySandwichPageFor },
  { pattern: BLOG_CATEGORY_PATTERN, load: blogCategoryPageFor },
  { pattern: BLOG_POST_PATTERN, load: blogPostPageFor },
]

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)

  try {
    const matches = ROUTES.flatMap(({ pattern, load }) => {
      const match = pattern.exec(url.pathname)
      if (match === null) return []
      const [, key = ''] = match
      return [{ load, key }]
    })
    const page = matches.length === 0 ? null : await matches[0].load(url, matches[0].key)

    if (page === null) return next()
    return page === NOT_FOUND ? await respondNotFound(url) : await respond(url, page)
  } catch {
    return next()
  }
}

export const config = {
  matcher: [
    '/s/:hash*',
    '/sandwiches',
    '/sandwiches/:slug',
    '/blog',
    '/blog/:slug',
    '/blog/category/:slug',
    '/community',
    '/community/:slug',
  ],
}
