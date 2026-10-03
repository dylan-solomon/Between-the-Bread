export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const titleTag = (title: string): string => `<title>${escapeHtml(title)}</title>`

export const metaTag = (property: string, content: string): string =>
  `<meta property="${property}" content="${escapeHtml(content)}" />`

const namedTag = (name: string, content: string): string =>
  `<meta name="${name}" content="${escapeHtml(content)}" />`

export const twitterTags = (props: {
  title: string
  description: string | null
  image: string | null
}): string[] => [
  namedTag('twitter:card', props.image === null ? 'summary' : 'summary_large_image'),
  namedTag('twitter:title', props.title),
  ...(props.description === null ? [] : [namedTag('twitter:description', props.description)]),
  ...(props.image === null ? [] : [namedTag('twitter:image', props.image)]),
]

export const descriptionTag = (description: string): string =>
  `<meta name="description" content="${escapeHtml(description)}" data-rh="true" />`

export const canonicalTag = (href: string): string =>
  `<link rel="canonical" href="${escapeHtml(href)}" data-rh="true" />`

export const structuredDataTag = (json: string): string =>
  `<script type="application/ld+json" data-rh="true">${json}</script>`
