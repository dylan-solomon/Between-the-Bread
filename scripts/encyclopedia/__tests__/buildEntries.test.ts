import { describe, it, expect } from 'vitest'
import { makeIngredientLookup } from '../ingredientCell'
import { buildEntries, slugify } from '../buildEntries'
import type { SheetRow } from '../types'

const lookup = makeIngredientLookup({
  bread: ['White Bread', 'Rye', 'Pain de mie'],
  protein: ['Ham', 'Corned Beef', 'Fried Egg'],
  cheese: ['Swiss', 'Cheddar', 'American', 'Gruyere'],
  toppings: ['Sauerkraut', 'Tomato'],
  condiments: ['Russian Dressing', 'Butter', 'Mayo'],
})

const makeRow = (overrides: Partial<SheetRow> = {}): SheetRow => ({
  Wave: '1',
  Sandwich: 'Reuben',
  'Short Description': 'Corned beef, Swiss, sauerkraut, and Russian dressing on rye.',
  History: 'The origins are disputed.\n\nIt is not kosher.',
  Country: 'United States',
  Region: 'Americas',
  Bread: 'Rye',
  Protein: 'Corned Beef',
  Cheese: 'Swiss',
  Toppings: 'Sauerkraut',
  Condiments: 'Russian Dressing',
  'Dietary Tags': null,
  'Wikipedia Article': 'Reuben sandwich',
  'Alternative Names': null,
  ...overrides,
})

const build = (rows: SheetRow[]) => buildEntries(rows, { lookup })

describe('slugify', () => {
  it.each([
    ['Reuben', 'reuben'],
    ['Mozzarella in Carrozza', 'mozzarella-in-carrozza'],
    ['Croque Monsieur', 'croque-monsieur'],
    ["Cuban Sandwich!", 'cuban-sandwich'],
    ['  Pâté   Sandwich ', 'pate-sandwich'],
  ])('turns %j into %j', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})

describe('buildEntries', () => {
  it('builds an unpublished entry from a row', () => {
    const { entries, problems } = build([makeRow()])

    expect(problems).toEqual([])
    expect(entries[0]).toMatchObject({
      name: 'Reuben',
      slug: 'reuben',
      description: 'Corned beef, Swiss, sauerkraut, and Russian dressing on rye.',
      history: 'The origins are disputed.\n\nIt is not kosher.',
      origin_country: 'United States',
      origin_region: 'Americas',
      dietary_tags: [],
      alternative_names: [],
      image_url: null,
      published: false,
    })
  })

  it('groups ingredients by category using the site names', () => {
    const { entries } = build([makeRow({ Bread: 'rye', Condiments: 'russian dressing' })])

    expect(entries[0]?.canonical_ingredients).toEqual({
      bread: [{ name: 'Rye' }],
      protein: [{ name: 'Corned Beef' }],
      cheese: [{ name: 'Swiss' }],
      toppings: [{ name: 'Sauerkraut' }],
      condiments: [{ name: 'Russian Dressing' }],
    })
  })

  it('leaves out categories with no ingredients', () => {
    const { entries } = build([makeRow({ Protein: 'None', Toppings: null })])

    expect(entries[0]?.canonical_ingredients).toEqual({
      bread: [{ name: 'Rye' }],
      cheese: [{ name: 'Swiss' }],
      condiments: [{ name: 'Russian Dressing' }],
    })
  })

  it('turns dietary tag labels into the site tags', () => {
    const { entries } = build([makeRow({ 'Dietary Tags': 'Vegetarian, Pescatarian, Contains Pork' })])

    expect(entries[0]?.dietary_tags).toEqual(['vegetarian', 'pescatarian', 'contains_pork'])
  })

  it.each(['None', '', null])('reads %j as no dietary tags', (tags) => {
    expect(build([makeRow({ 'Dietary Tags': tags })]).entries[0]?.dietary_tags).toEqual([])
  })

  it('splits alternative names on commas and trims them', () => {
    const { entries } = build([makeRow({ 'Alternative Names': ' Cheese toastie ,Cheese jaffle,, ' })])

    expect(entries[0]?.alternative_names).toEqual(['Cheese toastie', 'Cheese jaffle'])
  })

  it('stores a blank country as missing', () => {
    expect(build([makeRow({ Country: null, Region: 'Global' })]).entries[0]?.origin_country).toBeNull()
  })

  it('keeps the wikipedia article and wave with the entry for reference', () => {
    expect(build([makeRow()]).entries[0]?.source).toEqual({ wave: '1', wikipedia: 'Reuben sandwich' })
  })

  it('reports ingredients that were left out, with the sandwich they belong to', () => {
    const { notes } = build([makeRow({ Toppings: 'Egg dip', Condiments: 'Butter, Maple syrup (optional)' })])

    expect(notes).toEqual(
      expect.arrayContaining([
        { sandwich: 'Reuben', category: 'toppings', text: 'Egg dip', reason: 'not on the site' },
        { sandwich: 'Reuben', category: 'condiments', text: 'Maple syrup', reason: 'optional' },
      ]),
    )
  })

  describe('problems that stop the import', () => {
    const problemsFor = (overrides: Partial<SheetRow>) => build([makeRow(overrides)]).problems.map((p) => p.message)

    it('requires a sandwich name', () => {
      expect(problemsFor({ Sandwich: '' })).toEqual(expect.arrayContaining([expect.stringMatching(/name/i)]))
    })

    it('requires a description and a history', () => {
      expect(problemsFor({ 'Short Description': '  ' })).toEqual(expect.arrayContaining([expect.stringMatching(/description/i)]))
      expect(problemsFor({ History: null })).toEqual(expect.arrayContaining([expect.stringMatching(/history/i)]))
    })

    it('rejects a region the site does not have', () => {
      expect(problemsFor({ Region: 'Nationwide' })).toEqual(expect.arrayContaining([expect.stringMatching(/region.*Nationwide/i)]))
    })

    it('accepts every region the site has', () => {
      for (const region of ['Americas', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania', 'Global']) {
        expect(problemsFor({ Region: region })).toEqual([])
      }
    })

    it('rejects an unknown dietary tag', () => {
      expect(problemsFor({ 'Dietary Tags': 'Keto' })).toEqual(expect.arrayContaining([expect.stringMatching(/dietary.*Keto/i)]))
    })

    it('rejects two sandwiches that would get the same slug', () => {
      const { problems } = build([makeRow(), makeRow({ Sandwich: 'REUBEN' })])

      expect(problems.map((p) => p.message)).toEqual(expect.arrayContaining([expect.stringMatching(/same slug/i)]))
    })

    it('names the sandwich a problem belongs to', () => {
      const { problems } = build([makeRow({ Region: 'Nationwide' })])

      expect(problems[0]?.sandwich).toBe('Reuben')
    })

    it('does not build an entry for a row with a problem', () => {
      expect(build([makeRow({ Region: 'Nationwide' })]).entries).toEqual([])
    })

    it('still builds the good rows alongside a bad one', () => {
      const { entries } = build([makeRow({ Region: 'Nationwide' }), makeRow({ Sandwich: 'Patty Melt' })])

      expect(entries.map((e) => e.slug)).toEqual(['patty-melt'])
    })
  })

  it('skips completely empty rows', () => {
    const empty: SheetRow = { Sandwich: null }
    expect(build([empty, makeRow()]).entries).toHaveLength(1)
    expect(build([empty, makeRow()]).problems).toEqual([])
  })
})
