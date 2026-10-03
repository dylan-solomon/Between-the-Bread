import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { COHORTS, DASHBOARDS } from '../definitions'

const trackedEvents = new Set(
  [...readFileSync('src/analytics/events.ts', 'utf8').matchAll(/posthog\.capture\('([a-z_$]+)'/g)].map((match) => match[1]),
)

const chartEvents = DASHBOARDS.flatMap((dashboard) =>
  dashboard.charts.flatMap((chart) => (chart.kind === 'trend' ? chart.series : chart.steps).map((series) => series.event)),
)
const cohortEvents = COHORTS.flatMap((cohort) => cohort.anyOf.flat().map((rule) => rule.event))

describe('PostHog definitions', () => {
  it('only use events the site actually records', () => {
    const unknown = [...chartEvents, ...cohortEvents].filter((event) => !trackedEvents.has(event))

    expect(unknown).toEqual([])
  })

  it('define the five user groups from the plan', () => {
    expect(COHORTS.map((cohort) => cohort.name)).toEqual([
      'Power users',
      'Sharers',
      'Raters',
      'Explorers',
      'Community contributors',
    ])
  })

  it('define the four Phase 4 dashboards and the funnels', () => {
    expect(DASHBOARDS.map((dashboard) => dashboard.name)).toEqual([
      'Encyclopedia',
      'Community',
      'Search',
      'Blog',
      'Phase 4 funnels',
    ])
  })

  it('give every chart a unique name within its dashboard', () => {
    DASHBOARDS.forEach((dashboard) => {
      const names = dashboard.charts.map((chart) => chart.name)
      expect(new Set(names).size).toBe(names.length)
    })
  })

  it('give every funnel at least two steps', () => {
    const funnels = DASHBOARDS.flatMap((dashboard) => dashboard.charts).filter((chart) => chart.kind === 'funnel')

    expect(funnels.length).toBeGreaterThanOrEqual(4)
    funnels.forEach((funnel) => { expect(funnel.steps.length).toBeGreaterThanOrEqual(2) })
  })
})
