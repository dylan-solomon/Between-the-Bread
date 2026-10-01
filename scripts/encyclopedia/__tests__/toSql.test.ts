import { describe, it, expect } from 'vitest'
import { toSql } from '../toSql'
import type { EncyclopediaEntry } from '../types'

const makeEntry = (overrides: Partial<EncyclopediaEntry> = {}): EncyclopediaEntry => ({
  name: 'Reuben',
  slug: 'reuben',
  alternative_names: [],
  description: 'Corned beef on rye.',
  history: 'First paragraph.\n\nSecond paragraph.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }], protein: [{ name: 'Corned Beef' }] },
  dietary_tags: [],
  image_url: null,
  published: false,
  ...overrides,
})

describe('toSql', () => {
  it('inserts each entry into sandwich_database', () => {
    const sql = toSql([makeEntry(), makeEntry({ name: 'Rachel', slug: 'rachel' })], {})

    expect(sql.match(/INSERT INTO sandwich_database/g)).toHaveLength(2)
    expect(sql).toContain("'reuben'")
    expect(sql).toContain("'rachel'")
  })

  it('never publishes an entry on import', () => {
    const sql = toSql([makeEntry()], {})

    expect(sql).toMatch(/false\)\s*\nON CONFLICT/)
    expect(sql).not.toMatch(/published\s*=\s*true/)
  })

  it('stores the ingredients as category-keyed json', () => {
    const sql = toSql([makeEntry()], {})

    expect(sql).toContain(`'{"bread":[{"name":"Rye"}],"protein":[{"name":"Corned Beef"}]}'::jsonb`)
  })

  it('writes list columns as arrays', () => {
    const sql = toSql([makeEntry({ alternative_names: ['Cheese toastie', 'Cheese jaffle'], dietary_tags: ['vegetarian', 'pescatarian'] })], {})

    expect(sql).toContain("ARRAY['Cheese toastie', 'Cheese jaffle']::text[]")
    expect(sql).toContain("ARRAY['vegetarian', 'pescatarian']::text[]")
  })

  it('writes empty lists as empty arrays', () => {
    expect(toSql([makeEntry()], {})).toContain('ARRAY[]::text[]')
  })

  it('writes a missing country as null', () => {
    expect(toSql([makeEntry({ origin_country: null })], {})).toContain('NULL')
  })

  it('doubles single quotes so text cannot end a string early', () => {
    const sql = toSql([makeEntry({ description: "Reuben's \"classic\"; DROP TABLE x; --" })], {})

    expect(sql).toContain("'Reuben''s \"classic\"; DROP TABLE x; --'")
  })

  it('keeps paragraph breaks in the history', () => {
    expect(toSql([makeEntry()], {})).toContain('First paragraph.\n\nSecond paragraph.')
  })

  it('skips entries that already exist by default', () => {
    expect(toSql([makeEntry()], {})).toContain('ON CONFLICT (slug) DO NOTHING;')
  })

  describe('with update', () => {
    const sql = toSql([makeEntry()], { update: true })

    it('refreshes the written content of an existing entry', () => {
      expect(sql).toContain('ON CONFLICT (slug) DO UPDATE SET')
      for (const column of ['name', 'alternative_names', 'description', 'history', 'origin_country', 'origin_region', 'canonical_ingredients', 'dietary_tags']) {
        expect(sql).toContain(`${column} = EXCLUDED.${column}`)
      }
    })

    it('leaves publishing, images, and ratings alone', () => {
      const updateClause = sql.slice(sql.indexOf('DO UPDATE SET'))
      for (const column of ['published', 'image_url', 'avg_rating', 'rating_count']) {
        expect(updateClause).not.toContain(column)
      }
    })
  })

  it('says how it was generated and that it can be run again', () => {
    expect(toSql([makeEntry()], { source: 'wave-1' }).split('\n')[0]).toMatch(/^--/)
    expect(toSql([makeEntry()], { source: 'wave-1' })).toContain('wave-1')
  })
})
