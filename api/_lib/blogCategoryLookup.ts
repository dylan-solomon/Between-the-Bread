import type { SupabaseClient } from '@supabase/supabase-js'

type LookupResult =
  | { ok: true; ids: string[] }
  | { ok: false; status: 400 | 500; message: string }

export const resolveCategoryIds = async (
  supabase: SupabaseClient,
  slugs: string[],
): Promise<LookupResult> => {
  const unique = [...new Set(slugs)]
  if (unique.length === 0) return { ok: true, ids: [] }

  const { data, error } = await supabase.from('blog_categories').select('id, slug').in('slug', unique)
  if (error !== null) return { ok: false, status: 500, message: 'Failed to look up categories.' }

  const found = data as { id: string; slug: string }[]
  const unknown = unique.find((slug) => !found.some((category) => category.slug === slug))
  if (unknown !== undefined) return { ok: false, status: 400, message: `Unknown category: ${unknown}` }

  return { ok: true, ids: unique.map((slug) => found.filter((category) => category.slug === slug)[0].id) }
}
