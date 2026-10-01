export type BlogCategorySummary = { slug: string; name: string }

export type BlogCategory = BlogCategorySummary & {
  description: string | null
  post_count: number
}

export type BlogPostSummary = {
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  author_name: string
  published_at: string
  reading_time_minutes: number
  categories: BlogCategorySummary[]
}

export type RelatedSandwich = {
  name: string
  slug: string
  image_url: string | null
  description: string | null
}

export type BlogPost = BlogPostSummary & {
  id: string
  body: string
  meta_description: string | null
  updated_at: string
  related_sandwiches: RelatedSandwich[]
  more_posts: BlogPostSummary[]
}

export type BlogPostQuery = {
  category?: string
  limit?: number
  offset?: number
}

type BlogPostPage = { items: BlogPostSummary[]; totalCount: number }

const endpoint = (path: string): URL => new URL(path, window.location.origin)

export const fetchBlogPosts = async (query: BlogPostQuery): Promise<BlogPostPage> => {
  const url = endpoint('/api/blog')
  const params: [string, string | undefined][] = [
    ['category', query.category],
    ['limit', query.limit?.toString()],
    ['offset', query.offset?.toString()],
  ]
  params.forEach(([name, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(name, value)
  })

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch posts: ${String(response.status)}`)

  const body = (await response.json()) as { data: BlogPostSummary[]; meta: { total_count: number } }
  return { items: body.data, totalCount: body.meta.total_count }
}

export const fetchPublicBlogCategories = async (): Promise<BlogCategory[]> => {
  const response = await fetch(endpoint('/api/blog/categories').toString())
  if (!response.ok) throw new Error(`Failed to fetch blog categories: ${String(response.status)}`)

  return ((await response.json()) as { data: BlogCategory[] }).data
}

export const fetchBlogPost = async (slug: string): Promise<BlogPost | null> => {
  const response = await fetch(endpoint(`/api/blog/${encodeURIComponent(slug)}`).toString())
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to fetch post: ${String(response.status)}`)

  return ((await response.json()) as { data: BlogPost }).data
}
