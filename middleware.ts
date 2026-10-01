import { next } from '@vercel/edge'

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

type BlogPostApiResponse = {
  data: {
    slug: string
    title: string
    excerpt: string
    meta_description: string | null
    cover_image_url: string | null
    published_at: string
  }
}

type BlogCategoriesApiResponse = {
  data: { slug: string; name: string; description: string | null; post_count: number }[]
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const metaTag = (property: string, content: string): string =>
  `<meta property="${property}" content="${escapeHtml(content)}" />`

const twitterTag = (name: string, content: string): string =>
  `<meta name="${name}" content="${escapeHtml(content)}" />`

const twitterTags = (props: { title: string; description: string | null; image: string | null }): string[] => [
  twitterTag('twitter:card', props.image === null ? 'summary' : 'summary_large_image'),
  twitterTag('twitter:title', props.title),
  ...(props.description === null ? [] : [twitterTag('twitter:description', props.description)]),
  ...(props.image === null ? [] : [twitterTag('twitter:image', props.image)]),
]

const SHELL_SHARE_TAGS = /<title>[^<]*<\/title>\s*|<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g

const respondWithTags = async (url: URL, tags: string[]): Promise<Response> => {
  const htmlRes = await fetch(new URL('/', url).toString())
  const html = (await htmlRes.text()).replace(SHELL_SHARE_TAGS, '')
  const injected = html.replace('<head>', `<head>\n    ${tags.join('\n    ')}`)

  return new Response(injected, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

const shareTags = async (url: URL, hash: string): Promise<string[] | null> => {
  const apiRes = await fetch(`${url.origin}/api/sandwiches/share/${hash}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as ShareApiResponse
  const image = `${url.origin}/api/og/sandwich/${hash}`

  return [
    `<title>${escapeHtml(data.name)} | Between the Bread</title>`,
    metaTag('og:title', data.name),
    metaTag('og:url', `${url.origin}/s/${hash}`),
    metaTag('og:type', 'website'),
    metaTag('og:image', image),
    metaTag('og:image:width', '1200'),
    metaTag('og:image:height', '630'),
    ...twitterTags({ title: data.name, description: null, image }),
  ]
}

const sandwichTags = async (url: URL, slug: string): Promise<string[] | null> => {
  const apiRes = await fetch(`${url.origin}/api/database/${slug}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as SandwichApiResponse

  return [
    `<title>${escapeHtml(data.name)} | Between the Bread</title>`,
    metaTag('og:title', data.name),
    ...(data.description === null ? [] : [metaTag('og:description', data.description)]),
    ...(data.image_url === null ? [] : [metaTag('og:image', data.image_url)]),
    metaTag('og:url', `${url.origin}/sandwiches/${slug}`),
    metaTag('og:type', 'article'),
    ...twitterTags({ title: data.name, description: data.description, image: data.image_url }),
  ]
}

const blogPostTags = async (url: URL, slug: string): Promise<string[] | null> => {
  const apiRes = await fetch(`${url.origin}/api/blog/${slug}`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as BlogPostApiResponse
  const description = data.meta_description ?? data.excerpt

  return [
    `<title>${escapeHtml(data.title)} | Between the Bread</title>`,
    metaTag('og:title', data.title),
    metaTag('og:description', description),
    ...(data.cover_image_url === null ? [] : [metaTag('og:image', data.cover_image_url)]),
    metaTag('og:url', `${url.origin}/blog/${slug}`),
    metaTag('og:type', 'article'),
    metaTag('article:published_time', data.published_at),
    ...twitterTags({ title: data.title, description, image: data.cover_image_url }),
  ]
}

const blogCategoryTags = async (url: URL, slug: string): Promise<string[] | null> => {
  const apiRes = await fetch(`${url.origin}/api/blog/categories`)
  if (!apiRes.ok) return null

  const { data } = (await apiRes.json()) as BlogCategoriesApiResponse
  const category = data.find((candidate) => candidate.slug === slug && candidate.post_count > 0)
  if (category === undefined) return null

  const title = `${category.name} | Blog | Between the Bread`
  const description = category.description ?? `${category.name} posts from Between the Bread.`

  return [
    `<title>${escapeHtml(title)}</title>`,
    metaTag('og:title', title),
    metaTag('og:description', description),
    metaTag('og:url', `${url.origin}/blog/category/${slug}`),
    metaTag('og:type', 'website'),
    ...twitterTags({ title, description, image: null }),
  ]
}

const ROUTES: { pattern: RegExp; tags: (url: URL, key: string) => Promise<string[] | null> }[] = [
  { pattern: SHARE_PATTERN, tags: shareTags },
  { pattern: SANDWICH_PATTERN, tags: sandwichTags },
  { pattern: BLOG_CATEGORY_PATTERN, tags: blogCategoryTags },
  { pattern: BLOG_POST_PATTERN, tags: blogPostTags },
]

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)

  try {
    const matches = ROUTES.flatMap(({ pattern, tags }) => {
      const match = pattern.exec(url.pathname)
      return match === null ? [] : [{ tags, key: match[1] }]
    })
    const tags = matches.length === 0 ? null : await matches[0].tags(url, matches[0].key)

    return tags === null ? next() : await respondWithTags(url, tags)
  } catch {
    return next()
  }
}

export const config = {
  matcher: ['/s/:hash*', '/sandwiches/:slug', '/blog/:slug', '/blog/category/:slug'],
}
