import { next } from '@vercel/edge'

const SHARE_PATTERN = /^\/s\/([a-zA-Z0-9]{8})$/

type ShareApiResponse = {
  data: { hash: string; name: string }
}

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const match = SHARE_PATTERN.exec(url.pathname)

  if (match === null) {
    return next()
  }

  const hash = match[1]

  try {
    const apiRes = await fetch(`${url.origin}/api/sandwiches/share/${hash}`)
    if (!apiRes.ok) return next()

    const body = (await apiRes.json()) as unknown
    const { data } = body as ShareApiResponse

    const htmlRes = await fetch(new URL('/', url).toString())
    const html = await htmlRes.text()

    const ogTags = [
      `<title>${data.name} | Between the Bread</title>`,
      `<meta property="og:title" content="${data.name}" />`,
      `<meta property="og:url" content="${url.origin}/s/${hash}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:image" content="${url.origin}/api/og/sandwich/${hash}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
    ].join('\n    ')

    const injected = html.replace('<head>', `<head>\n    ${ogTags}`)

    return new Response(injected, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  } catch {
    return next()
  }
}

export const config = { matcher: ['/s/:hash*'] }
