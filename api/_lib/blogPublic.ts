export const LIST_POST_COLUMNS =
  'slug, title, excerpt, cover_image_url, author_name, published_at, reading_time_minutes, blog_post_categories(blog_categories(slug, name, display_order))'

export const DETAIL_POST_COLUMNS =
  'id, slug, title, excerpt, body, cover_image_url, related_sandwich_slugs, author_name, meta_description, reading_time_minutes, published_at, updated_at, blog_post_categories(blog_categories(id, slug, name, display_order))'

export const MORE_POSTS_COUNT = 3

export const nowIso = (): string => new Date().toISOString()
