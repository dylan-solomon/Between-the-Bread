import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { parseBlogPostInput } from '../../../api/_lib/blogPostInput'
import { parsePost } from '../parsePost'
import type { LaunchPost } from '../parsePost'

const POSTS_DIR = resolve(import.meta.dirname, '../../../supabase/seeds/blog/posts')
const ENTRIES_PATH = resolve(import.meta.dirname, '../../../supabase/seeds/encyclopedia/wave-1.json')

const LAUNCH_CATEGORIES = ['sandwich-ideas', 'best-pairings', 'techniques-and-guides', 'dietary']

const EXPECTED_POSTS: Record<string, { category: string; titleIncludes: string }> = {
  'keep-grilled-cheese-from-burning': { category: 'techniques-and-guides', titleIncludes: 'Keep Grilled Cheese From Burning' },
  'best-cheese-for-grilled-cheese': { category: 'best-pairings', titleIncludes: 'Best Cheeses for Grilled Cheese' },
  'vegan-grilled-cheese': { category: 'dietary', titleIncludes: 'Vegan Grilled Cheese' },
  'what-to-serve-with-grilled-cheese': { category: 'sandwich-ideas', titleIncludes: 'What to Serve With Grilled Cheese' },
}

const loadPosts = (): LaunchPost[] =>
  existsSync(POSTS_DIR)
    ? readdirSync(POSTS_DIR)
        .filter((file) => file.endsWith('.md'))
        .sort()
        .map((file) => parsePost(basename(file, '.md'), readFileSync(resolve(POSTS_DIR, file), 'utf8')))
    : []

const posts = loadPosts()
const slugs = posts.map((post) => post.slug)
const entrySlugs = (JSON.parse(readFileSync(ENTRIES_PATH, 'utf8')) as { slug: string }[]).map((entry) => entry.slug)

const siteLinks = (body: string): string[] => [...body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((match) => match[1])
const blogLinks = (post: LaunchPost): string[] =>
  siteLinks(post.body).filter((link) => link.startsWith('/blog/')).map((link) => link.slice('/blog/'.length))
const entryLinks = (post: LaunchPost): string[] =>
  siteLinks(post.body).filter((link) => link.startsWith('/sandwiches/')).map((link) => link.slice('/sandwiches/'.length))
const wordCount = (body: string): number => body.split(/\s+/).filter((word) => word !== '').length

describe('launch posts', () => {
  it('are the four planned posts', () => {
    expect(slugs.sort()).toEqual(Object.keys(EXPECTED_POSTS).sort())
  })

  it('cover every launch category, each post in its planned category', () => {
    expect([...new Set(posts.flatMap((post) => post.category_slugs))].sort()).toEqual([...LAUNCH_CATEGORIES].sort())
    posts.forEach((post) => {
      expect(post.category_slugs).toContain(EXPECTED_POSTS[post.slug].category)
    })
  })

  it.each(Object.keys(EXPECTED_POSTS))('%s passes the same checks the admin applies to a new post', (slug) => {
    const post = posts.find((candidate) => candidate.slug === slug)
    expect(post).toBeDefined()
    if (post === undefined) return

    const result = parseBlogPostInput(
      {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        meta_description: post.meta_description,
        related_sandwich_slugs: post.related_sandwich_slugs,
        category_slugs: post.category_slugs,
      },
      'create',
    )

    expect(result).toMatchObject({ ok: true })
  })

  it.each(Object.keys(EXPECTED_POSTS))('%s has the title its target search needs', (slug) => {
    expect(posts.find((post) => post.slug === slug)?.title).toContain(EXPECTED_POSTS[slug].titleIncludes)
  })

  it.each(Object.keys(EXPECTED_POSTS))('%s is a full article of 600 to 1,600 words with section headings', (slug) => {
    const post = posts.find((candidate) => candidate.slug === slug)
    expect(wordCount(post?.body ?? '')).toBeGreaterThanOrEqual(600)
    expect(wordCount(post?.body ?? '')).toBeLessThanOrEqual(1600)
    expect((post?.body.match(/^## /gm) ?? []).length).toBeGreaterThanOrEqual(4)
    expect(post?.body.startsWith('#')).toBe(false)
  })

  it.each(Object.keys(EXPECTED_POSTS))('%s contains no raw HTML', (slug) => {
    expect(posts.find((post) => post.slug === slug)?.body).not.toMatch(/<\/?[a-z][^>]*>/i)
  })

  it.each(Object.keys(EXPECTED_POSTS))('%s makes no claim that the site tested anything', (slug) => {
    expect(posts.find((post) => post.slug === slug)?.body).not.toMatch(/\b(we|our team) (tested|tried|taste-tested)\b|\bour (tests?|testing)\b/i)
  })

  it('only link to pages that exist: the other launch posts, loaded encyclopedia entries and the generator', () => {
    posts.forEach((post) => {
      siteLinks(post.body).forEach((link) => {
        const known =
          link === '/' ||
          (link.startsWith('/blog/') && slugs.includes(link.slice('/blog/'.length))) ||
          (link.startsWith('/sandwiches/') && entrySlugs.includes(link.slice('/sandwiches/'.length)))
        expect(known, `${post.slug} links to ${link}`).toBe(true)
      })
    })
  })

  it('link to at least two of the other launch posts and never to themselves', () => {
    posts.forEach((post) => {
      const others = new Set(blogLinks(post))
      expect(others.has(post.slug), `${post.slug} links to itself`).toBe(false)
      expect(others.size, `${post.slug} links to other posts`).toBeGreaterThanOrEqual(2)
    })
  })

  it('are all linked to from at least one other post, so none is orphaned', () => {
    posts.forEach((post) => {
      const linkedFrom = posts.filter((other) => other.slug !== post.slug && blogLinks(other).includes(post.slug))
      expect(linkedFrom.length, `${post.slug} is linked from other posts`).toBeGreaterThanOrEqual(1)
    })
  })

  it('link to loaded encyclopedia entries and list those entries as related sandwiches', () => {
    posts.forEach((post) => {
      expect(post.related_sandwich_slugs.length, `${post.slug} related sandwiches`).toBeGreaterThanOrEqual(2)
      post.related_sandwich_slugs.forEach((slug) => {
        expect(entrySlugs, `${post.slug} relates to ${slug}`).toContain(slug)
      })
      expect(entryLinks(post).length, `${post.slug} links to entries`).toBeGreaterThanOrEqual(2)
    })
  })

  it('stay within the length the search results and share cards can show', () => {
    posts.forEach((post) => {
      expect(post.title.length).toBeLessThanOrEqual(150)
      expect(post.excerpt.length).toBeLessThanOrEqual(300)
      expect(post.meta_description.length).toBeLessThanOrEqual(200)
    })
  })
})
