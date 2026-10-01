import { describe, it, expect } from 'vitest'
import { parseBlogCategoryInput } from '../blogCategoryInput.js'

describe('parseBlogCategoryInput on create', () => {
  it('derives the slug from the name when none is given', () => {
    const result = parseBlogCategoryInput({ name: 'Best Pairings' }, 'create')

    expect(result).toEqual({ ok: true, value: { name: 'Best Pairings', slug: 'best-pairings', description: null } })
  })

  it('keeps an explicit slug and the optional fields', () => {
    const result = parseBlogCategoryInput(
      { name: 'Dietary', slug: 'diet', description: 'Vegan and more', display_order: 4 },
      'create',
    )

    expect(result).toEqual({
      ok: true,
      value: { name: 'Dietary', slug: 'diet', description: 'Vegan and more', display_order: 4 },
    })
  })

  it('trims the name', () => {
    const result = parseBlogCategoryInput({ name: '  Dietary  ' }, 'create')

    expect(result.ok && result.value.name).toBe('Dietary')
  })

  it.each([
    ['a missing name', {}, 'name is required.'],
    ['a blank name', { name: '   ' }, 'name must be 1-60 characters.'],
    ['a name over 60 characters', { name: 'x'.repeat(61) }, 'name must be 1-60 characters.'],
    ['a name that yields no slug', { name: '!!!' }, 'slug could not be created from the name; provide one.'],
    ['an invalid slug', { name: 'Dietary', slug: 'Not A Slug' }, 'slug must be lowercase letters, numbers and hyphens.'],
    ['a long description', { name: 'Dietary', description: 'x'.repeat(301) }, 'description must be text of up to 300 characters.'],
    ['a non-integer order', { name: 'Dietary', display_order: 1.5 }, 'display_order must be a whole number of 0 or more.'],
    ['a negative order', { name: 'Dietary', display_order: -1 }, 'display_order must be a whole number of 0 or more.'],
  ])('rejects %s', (_label, body, message) => {
    expect(parseBlogCategoryInput(body, 'create')).toEqual({ ok: false, message })
  })

  it('rejects a body that is not an object', () => {
    expect(parseBlogCategoryInput('nope', 'create')).toEqual({ ok: false, message: 'name is required.' })
  })
})

describe('parseBlogCategoryInput on update', () => {
  it('accepts name, description and order', () => {
    const result = parseBlogCategoryInput({ name: 'Diets', description: null, display_order: 2 }, 'update')

    expect(result).toEqual({ ok: true, value: { name: 'Diets', description: null, display_order: 2 } })
  })

  it('refuses to change the slug because it appears in public URLs', () => {
    expect(parseBlogCategoryInput({ slug: 'new-slug' }, 'update')).toEqual({
      ok: false,
      message: 'slug cannot be changed.',
    })
  })

  it('requires at least one editable field', () => {
    expect(parseBlogCategoryInput({}, 'update')).toEqual({
      ok: false,
      message: 'Request body must contain at least one editable field.',
    })
  })

  it('applies the same limits as create', () => {
    expect(parseBlogCategoryInput({ name: '' }, 'update')).toEqual({ ok: false, message: 'name must be 1-60 characters.' })
  })
})
