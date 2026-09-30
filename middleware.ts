import { next } from '@vercel/edge'

const SHARE_PATTERN = /^\/s\/([a-zA-Z0-9]{8})$/
const SANDWICH_PATTERN = /^\/sandwiches\/([a-z0-9]+(?:-[a-z0-9]+)*)$/

type ShareApiResponse = {
  data: { hash: string; name: string }
}

type SandwichApiResponse = {
  data: { name: string; slug: string; description: string | null; image_url: string | null }
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

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const shareMatch = SHARE_PATTERN.exec(url.pathname)
  const sandwichMatch = SANDWICH_PATTERN.exec(url.pathname)

  try {
    const tags = shareMatch !== null
      ? await shareTags(url, shareMatch[1])
      : sandwichMatch !== null
        ? await sandwichTags(url, sandwichMatch[1])
        : null

    return tags === null ? next() : await respondWithTags(url, tags)
  } catch {
    return next()
  }
}

export const config = { matcher: ['/s/:hash*', '/sandwiches/:slug'] }
