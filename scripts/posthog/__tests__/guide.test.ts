import { describe, it, expect } from 'vitest'
import { setupGuide } from '../guide'
import type { Cohort, Dashboard } from '../definitions'

const cohorts: Cohort[] = [
  {
    name: 'Raters',
    description: 'Rated 5 or more sandwiches.',
    anyOf: [
      [{ event: 'sandwich_rated', atLeast: 5, withinDays: 365 }],
      [{ event: 'history_sandwich_rated', atLeast: 5, withinDays: 365 }],
    ],
  },
  {
    name: 'Power users',
    description: 'Saved a lot and visited recently.',
    anyOf: [[{ event: 'history_sandwich_saved', atLeast: 10, withinDays: 365 }, { event: '$pageview', atLeast: 1, withinDays: 7 }]],
  },
]

const dashboards: Dashboard[] = [
  {
    name: 'Search',
    description: 'Searches.',
    charts: [
      {
        kind: 'trend',
        name: 'Searches with no results',
        description: 'Searches that found nothing.',
        series: [{ event: 'search_performed', filters: [{ key: 'results_count', value: 0 }] }],
        breakdown: 'query',
        display: 'table',
        days: 30,
      },
      {
        kind: 'funnel',
        name: 'Search click-through',
        description: 'Searches that lead to a click.',
        steps: [{ event: 'search_performed' }, { event: 'search_result_clicked' }],
        windowDays: 1,
        days: 30,
      },
    ],
  },
]

const guide = setupGuide({ cohorts, dashboards })

describe('setupGuide', () => {
  it('explains each user group as conditions in plain words', () => {
    expect(guide).toContain('### Raters')
    expect(guide).toContain('Match people who meet **any** of these:')
    expect(guide).toContain('- `sandwich_rated` at least 5 times in the last 365 days')
    expect(guide).toContain('- `history_sandwich_rated` at least 5 times in the last 365 days')
  })

  it('joins conditions that must all be true', () => {
    expect(guide).toContain('- `history_sandwich_saved` at least 10 times in the last 365 days **and** `$pageview` in the last 7 days')
  })

  it('lists each dashboard with how to build every chart', () => {
    expect(guide).toContain('## Dashboard: Search')
    expect(guide).toContain('### Searches with no results')
    expect(guide).toContain('Trends insight, shown as a table, last 30 days.')
    expect(guide).toContain('- Event `search_performed` where `results_count` = `0`')
    expect(guide).toContain('Break down by event property `query`.')
  })

  it('lists funnel steps in order with the conversion window', () => {
    expect(guide).toContain('Funnel insight, last 30 days, steps completed within 1 day.')
    expect(guide).toContain('1. `search_performed`')
    expect(guide).toContain('2. `search_result_clicked`')
  })
})
