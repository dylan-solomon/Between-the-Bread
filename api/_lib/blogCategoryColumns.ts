export const ADMIN_CATEGORY_COLUMNS = 'id, slug, name, description, display_order, blog_post_categories(count)'

type CategoryRow = {
  blog_post_categories?: { count: number }[]
} & Record<string, unknown>

export const toAdminCategory = (row: CategoryRow): Record<string, unknown> => {
  const { blog_post_categories: links, ...category } = row
  return { ...category, post_count: links?.[0]?.count ?? 0 }
}
