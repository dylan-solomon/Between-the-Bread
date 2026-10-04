import { describe, it, expect } from 'vitest'
import { buildSeed, orderSeedFiles, parseEntries } from '../seed'
import type { EncyclopediaEntry } from '../types'

const makeEntry = (overrides: Partial<EncyclopediaEntry> = {}): EncyclopediaEntry => ({
  name: 'Reuben',
  slug: 'reuben',
  alternative_names: [],
  description: 'Corned beef on rye.',
  history: 'Old history.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }] },
  dietary_tags: [],
  image_url: null,
  published: false,
  ...overrides,
})

describe('orderSeedFiles', () => {
  it('puts waves in number order and the live snapshot last', () => {
    expect(orderSeedFiles(['live.json', 'wave-10.json', 'wave-2.json', 'all.sql', 'wave-1.sql', 'wave-1.json'])).toEqual([
      'wave-1.json',
      'wave-2.json',
      'wave-10.json',
      'live.json',
    ])
  })
})

describe('parseEntries', () => {
  it('accepts entries in the importer format', () => {
    const entry = { ...makeEntry(), source: { wave: '1', wikipedia: null } }

    expect(parseEntries([entry], 'wave-1.json')).toEqual({ entries: [makeEntry()], problems: [] })
  })

  it('treats missing text as empty', () => {
    const { entries } = parseEntries([{ ...makeEntry(), description: null, history: null }], 'live.json')

    expect(entries[0]).toMatchObject({ description: '', history: '' })
  })

  it('reports entries it cannot use and keeps the rest', () => {
    const { entries, problems } = parseEntries(
      [makeEntry(), { name: 'No slug' }, { ...makeEntry({ slug: 'bad' }), dietary_tags: 'vegan' }],
      'wave-9.json',
    )

    expect(entries).toEqual([makeEntry()])
    expect(problems).toEqual(['wave-9.json entry 2 (No slug) is missing or has a wrong slug', 'wave-9.json entry 3 (bad) is missing or has a wrong dietary_tags'])
  })

  it('reports a file that is not a list', () => {
    expect(parseEntries({ entries: [] }, 'broken.json').problems).toEqual(['broken.json is not a list of entries'])
  })
})

describe('buildSeed', () => {
  it('writes every entry from every file once', () => {
    const { entries, sql } = buildSeed(
      [
        { file: 'wave-1.json', data: [makeEntry()] },
        { file: 'wave-2.json', data: [makeEntry({ name: 'Rachel', slug: 'rachel' })] },
      ],
      {},
    )

    expect(entries.map((entry) => entry.slug)).toEqual(['reuben', 'rachel'])
    expect(sql.match(/INSERT INTO sandwich_database/g)).toHaveLength(2)
  })

  it('lets a later file replace an earlier entry with the same slug', () => {
    const live = makeEntry({ history: 'Edited history.', published: true, image_url: 'https://cdn.example.com/reuben.webp' })

    const { entries } = buildSeed(
      [
        { file: 'wave-1.json', data: [makeEntry(), makeEntry({ name: 'Rachel', slug: 'rachel' })] },
        { file: 'live.json', data: [live] },
      ],
      {},
    )

    expect(entries).toEqual([live, makeEntry({ name: 'Rachel', slug: 'rachel' })])
  })

  it('names the files it was built from', () => {
    const { sql } = buildSeed([{ file: 'wave-1.json', data: [makeEntry()] }, { file: 'live.json', data: [] }], {})

    expect(sql.split('\n')[0]).toContain('wave-1, live')
  })

  it('passes problems through', () => {
    expect(buildSeed([{ file: 'wave-1.json', data: 'nope' }], {}).problems).toEqual(['wave-1.json is not a list of entries'])
  })

  it('only refreshes existing entries when asked', () => {
    expect(buildSeed([{ file: 'wave-1.json', data: [makeEntry()] }], {}).sql).toContain('DO NOTHING')
    expect(buildSeed([{ file: 'wave-1.json', data: [makeEntry()] }], { update: true }).sql).toContain('DO UPDATE SET')
  })
})
