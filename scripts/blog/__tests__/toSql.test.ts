import { describe, it, expect } from 'vitest'
import { toSql } from '../toSql'
import type { LaunchPost } from '../parsePost'

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ')

const makePost = (overrides: Partial<LaunchPost> = {}): LaunchPost => ({
  slug: 'best-cheese-for-grilled-cheese',
  title: "The Best Cheeses for Grilled Cheese (and the Ones That Don't Melt Well)",
  excerpt: "A guide to what melts and what doesn't.",
  meta_description: 'Pick the right cheese.',
  category_slugs: ['best-pairings'],
  related_sandwich_slugs: ['grilled-cheese', 'reuben'],
  body: 'Some body text with a [link](/blog/other).',
  ...overrides,
})

describe('toSql', () => {
  it('creates each post as an unpublished draft that never overwrites an existing post', () => {
    const sql = toSql([makePost()], {})

    expect(sql).toContain('INSERT INTO blog_posts')
    expect(sql).toContain('false')
    expect(sql).toContain('ON CONFLICT (slug) DO NOTHING')
    expect(sql).not.toContain('DO UPDATE')
  })

  it('writes the slug, title, excerpt, description and byline', () => {
    const sql = toSql([makePost()], {})

    expect(sql).toContain("'best-cheese-for-grilled-cheese'")
    expect(sql).toContain("'The Best Cheeses for Grilled Cheese (and the Ones That Don''t Melt Well)'")
    expect(sql).toContain("'A guide to what melts and what doesn''t.'")
    expect(sql).toContain("'Pick the right cheese.'")
    expect(sql).toContain("'Between the Bread'")
  })

  it('writes the related sandwiches as an array', () => {
    expect(toSql([makePost()], {})).toContain("ARRAY['grilled-cheese', 'reuben']::text[]")
  })

  it('writes an empty array when there are no related sandwiches', () => {
    expect(toSql([makePost({ related_sandwich_slugs: [] })], {})).toContain('ARRAY[]::text[]')
  })

  it('computes the reading time from the body, about 200 words a minute', () => {
    const sql = toSql([makePost({ body: words(650) })], {})

    expect(sql).toMatch(/, 4, false/)
  })

  it('keeps the body exactly as written, including quotes and dollar signs', () => {
    const body = "It's $5 and \"quoted\".\n\n$body$ inside"
    const sql = toSql([makePost({ body })], {})

    expect(sql).toContain(body)
  })

  it('chooses a quoting tag that does not appear in the body', () => {
    const sql = toSql([makePost({ body: 'has $body$ and $post$ inside' })], {})

    expect(sql).toMatch(/\$[a-z0-9_]+\$has \$body\$ and \$post\$ inside\$[a-z0-9_]+\$/)
    expect(sql).not.toContain('$body$has')
  })

  it('links a post to its categories only when the post is newly created, so later edits are never undone', () => {
    const sql = toSql([makePost({ category_slugs: ['best-pairings', 'dietary'] })], {})

    expect(sql).toContain('WITH new_post AS (')
    expect(sql).toContain('RETURNING id')
    expect(sql).toContain('INSERT INTO blog_post_categories (post_id, category_id)')
    expect(sql).toContain('FROM new_post')
    expect(sql).toContain("c.slug IN ('best-pairings', 'dietary')")
  })

  it('writes one block per post', () => {
    const sql = toSql([makePost(), makePost({ slug: 'second-post' })], {})

    expect(sql.match(/INSERT INTO blog_posts/g)).toHaveLength(2)
  })

  it('explains in a header how to use the file', () => {
    const sql = toSql([makePost()], { source: 'launch posts' })

    expect(sql).toContain('-- Blog seed: launch posts (1 posts)')
    expect(sql).toContain('unpublished')
    expect(sql).toContain('Safe to run more than once')
  })
})
