import { describe, it, expect } from 'vitest'
import { parsePost } from '../parsePost'

const file = (header: string, body = 'Body text.\n\n## A heading\n\nMore text.') => `---\n${header}\n---\n\n${body}\n`

const fullHeader = [
  'title: Vegan Grilled Cheese: Which Dairy-Free Cheeses Melt',
  'excerpt: A short teaser.',
  'meta_description: For search engines.',
  'categories: dietary, sandwich-ideas',
  'related_sandwiches: grilled-cheese, reuben',
].join('\n')

describe('parsePost', () => {
  it('reads the header fields and takes the slug from the file name', () => {
    const post = parsePost('vegan-grilled-cheese', file(fullHeader))

    expect(post).toMatchObject({
      slug: 'vegan-grilled-cheese',
      title: 'Vegan Grilled Cheese: Which Dairy-Free Cheeses Melt',
      excerpt: 'A short teaser.',
      meta_description: 'For search engines.',
      category_slugs: ['dietary', 'sandwich-ideas'],
      related_sandwich_slugs: ['grilled-cheese', 'reuben'],
    })
  })

  it('keeps colons inside a value', () => {
    expect(parsePost('a', file(fullHeader)).title).toBe('Vegan Grilled Cheese: Which Dairy-Free Cheeses Melt')
  })

  it('returns the body without the header or the blank line after it', () => {
    expect(parsePost('a', file(fullHeader, 'First paragraph.\n\nSecond.')).body).toBe('First paragraph.\n\nSecond.')
  })

  it('allows a post with no related sandwiches', () => {
    const header = fullHeader.replace('related_sandwiches: grilled-cheese, reuben', 'related_sandwiches:')

    expect(parsePost('a', file(header)).related_sandwich_slugs).toEqual([])
  })

  it.each([
    ['a missing header', 'Just a body.', 'a: no header found'],
    ['an unfinished header', '---\ntitle: x\n\nBody', 'a: header is not closed with ---'],
    ['a missing title', file(fullHeader.replace(/title: .*\n/, '')), 'a: missing title'],
    ['a missing excerpt', file(fullHeader.replace(/excerpt: .*\n/, '')), 'a: missing excerpt'],
    ['a missing meta description', file(fullHeader.replace(/meta_description: .*\n/, '')), 'a: missing meta_description'],
    ['missing categories', file(fullHeader.replace(/categories: .*\n/, '')), 'a: missing categories'],
    ['an empty body', file(fullHeader, ''), 'a: the post has no body'],
  ])('rejects %s', (_label, text, message) => {
    expect(() => parsePost('a', text)).toThrow(message)
  })
})
