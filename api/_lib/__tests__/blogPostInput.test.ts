import { describe, it, expect } from 'vitest'
import { parseBlogPostInput } from '../blogPostInput.js'

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ')

describe('parseBlogPostInput on create', () => {
  it('derives the slug from the title and applies no other defaults', () => {
    const result = parseBlogPostInput({ title: 'The Perfect Grilled Cheese' }, 'create')

    expect(result).toEqual({ ok: true, value: { title: 'The Perfect Grilled Cheese', slug: 'the-perfect-grilled-cheese' } })
  })

  it('keeps every valid field and separates out the category slugs', () => {
    const result = parseBlogPostInput(
      {
        title: 'Vegan builds',
        slug: 'vegan-builds',
        excerpt: 'Five builds.',
        body: words(450),
        cover_image_url: 'https://example.com/cover.jpg',
        related_sandwich_slugs: ['reuben', 'cubano'],
        meta_description: 'Five vegan sandwiches.',
        author_name: 'Dylan',
        published: true,
        published_at: '2026-10-01T12:00:00.000Z',
        category_slugs: ['dietary', 'sandwich-ideas'],
      },
      'create',
    )

    expect(result).toEqual({
      ok: true,
      value: {
        title: 'Vegan builds',
        slug: 'vegan-builds',
        excerpt: 'Five builds.',
        body: words(450),
        cover_image_url: 'https://example.com/cover.jpg',
        related_sandwich_slugs: ['reuben', 'cubano'],
        meta_description: 'Five vegan sandwiches.',
        author_name: 'Dylan',
        published: true,
        published_at: '2026-10-01T12:00:00.000Z',
        reading_time_minutes: 3,
      },
      categorySlugs: ['dietary', 'sandwich-ideas'],
    })
  })

  it('computes the reading time on the server and ignores one sent by the client', () => {
    const result = parseBlogPostInput({ title: 'Short', body: words(10), reading_time_minutes: 99 }, 'create')

    expect(result.ok && result.value.reading_time_minutes).toBe(1)
  })

  it('trims the title', () => {
    const result = parseBlogPostInput({ title: '  Hello  ' }, 'create')

    expect(result.ok && result.value.title).toBe('Hello')
  })

  it.each([
    ['a missing title', {}, 'title is required.'],
    ['a blank title', { title: '  ' }, 'title must be 1-150 characters.'],
    ['a long title', { title: 'x'.repeat(151) }, 'title must be 1-150 characters.'],
    ['a title that yields no slug', { title: '!!!' }, 'slug could not be created from the title; provide one.'],
    ['an invalid slug', { title: 'Hi', slug: 'Not A Slug' }, 'slug must be lowercase letters, numbers and hyphens.'],
    ['the reserved slug categories', { title: 'Hi', slug: 'categories' }, 'That slug is reserved.'],
    ['the reserved slug category', { title: 'Hi', slug: 'category' }, 'That slug is reserved.'],
    ['a long excerpt', { title: 'Hi', excerpt: 'x'.repeat(301) }, 'excerpt must be text of up to 300 characters.'],
    ['a body that is not text', { title: 'Hi', body: 5 }, 'body must be text of up to 100000 characters.'],
    ['an image that is not http(s)', { title: 'Hi', cover_image_url: 'javascript:alert(1)' }, 'cover_image_url must be an http(s) URL.'],
    ['related slugs that are not slugs', { title: 'Hi', related_sandwich_slugs: ['Reuben'] }, 'related_sandwich_slugs must be a list of up to 10 lowercase slugs.'],
    ['too many related slugs', { title: 'Hi', related_sandwich_slugs: Array.from({ length: 11 }, (_v, i) => `s${String(i)}`) }, 'related_sandwich_slugs must be a list of up to 10 lowercase slugs.'],
    ['a long meta description', { title: 'Hi', meta_description: 'x'.repeat(201) }, 'meta_description must be text of up to 200 characters.'],
    ['a blank author name', { title: 'Hi', author_name: ' ' }, 'author_name must be 1-80 characters.'],
    ['a published flag that is not a boolean', { title: 'Hi', published: 'yes' }, 'published must be true or false.'],
    ['a publish date that is not a date', { title: 'Hi', published_at: 'tomorrow-ish' }, 'published_at must be a date and time.'],
    ['categories that are not slugs', { title: 'Hi', category_slugs: ['Not A Slug'] }, 'category_slugs must be a list of up to 10 category slugs.'],
  ])('rejects %s', (_label, body, message) => {
    expect(parseBlogPostInput(body, 'create')).toEqual({ ok: false, message })
  })

  it('accepts null for the optional fields that can be cleared', () => {
    const result = parseBlogPostInput(
      { title: 'Hi', cover_image_url: null, meta_description: null, published_at: null },
      'create',
    )

    expect(result.ok && result.value).toMatchObject({ cover_image_url: null, meta_description: null, published_at: null })
  })
})

describe('parseBlogPostInput on update', () => {
  it('accepts a partial update, including a new slug', () => {
    const result = parseBlogPostInput({ slug: 'new-slug', excerpt: 'New.' }, 'update')

    expect(result).toEqual({ ok: true, value: { slug: 'new-slug', excerpt: 'New.' } })
  })

  it('recomputes the reading time when the body changes', () => {
    const result = parseBlogPostInput({ body: words(401) }, 'update')

    expect(result.ok && result.value.reading_time_minutes).toBe(3)
  })

  it('accepts a change to categories alone', () => {
    const result = parseBlogPostInput({ category_slugs: ['dietary'] }, 'update')

    expect(result).toEqual({ ok: true, value: {}, categorySlugs: ['dietary'] })
  })

  it('does not require a title', () => {
    expect(parseBlogPostInput({ published: false }, 'update')).toEqual({ ok: true, value: { published: false } })
  })

  it('requires at least one editable field', () => {
    expect(parseBlogPostInput({}, 'update')).toEqual({
      ok: false,
      message: 'Request body must contain at least one editable field.',
    })
  })

  it('applies the same limits as create', () => {
    expect(parseBlogPostInput({ slug: 'category' }, 'update')).toEqual({ ok: false, message: 'That slug is reserved.' })
  })
})
