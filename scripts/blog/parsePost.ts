export type LaunchPost = {
  slug: string
  title: string
  excerpt: string
  meta_description: string
  category_slugs: string[]
  related_sandwich_slugs: string[]
  body: string
}

const HEADER_START = '---\n'
const HEADER_END = '\n---'

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

const readHeader = (lines: string[]): Record<string, string> =>
  Object.fromEntries(
    lines
      .filter((line) => line.includes(':'))
      .map((line) => {
        const colon = line.indexOf(':')
        return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()]
      }),
  )

export const parsePost = (slug: string, text: string): LaunchPost => {
  if (!text.startsWith(HEADER_START)) throw new Error(`${slug}: no header found`)

  const end = text.indexOf(HEADER_END, HEADER_START.length)
  if (end === -1) throw new Error(`${slug}: header is not closed with ---`)

  const header = readHeader(text.slice(HEADER_START.length, end).split('\n'))
  const body = text.slice(end + HEADER_END.length).trim()

  const required = (field: string): string => {
    const value = header[field] as string | undefined
    if (value === undefined || value === '') throw new Error(`${slug}: missing ${field}`)
    return value
  }

  const title = required('title')
  const excerpt = required('excerpt')
  const metaDescription = required('meta_description')
  const categories = required('categories')
  if (body === '') throw new Error(`${slug}: the post has no body`)

  return {
    slug,
    title,
    excerpt,
    meta_description: metaDescription,
    category_slugs: splitList(categories),
    related_sandwich_slugs: splitList(header.related_sandwiches),
    body,
  }
}
