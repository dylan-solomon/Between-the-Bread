export const ADMIN_POST_COLUMNS =
  'id, slug, title, excerpt, body, cover_image_url, related_sandwich_slugs, author_name, meta_description, reading_time_minutes, published, published_at, created_at, updated_at, blog_post_categories(blog_categories(slug, name, display_order))'

type CategoryLink = { blog_categories: { slug: string; name: string; display_order: number } }

type PostRow = {
  blog_post_categories?: CategoryLink[]
} & Record<string, unknown>

export const isPostRow = (value: unknown): value is PostRow =>
  typeof value === 'object' && value !== null

export const toAdminPost = (row: PostRow): Record<string, unknown> => {
  const { blog_post_categories: links = [], ...post } = row
  const categories = links
    .map((link) => link.blog_categories)
    .sort((a, b) => a.display_order - b.display_order)
    .map(({ slug, name }) => ({ slug, name }))
  return { ...post, categories }
}
