import { describe, it, expect } from 'vitest'
import { cohortBody, insightBody } from '../toPosthog'
import type { Chart, Cohort } from '../definitions'

describe('insightBody', () => {
  it('turns a trend chart into a PostHog trends insight on a dashboard', () => {
    const chart: Chart = {
      kind: 'trend',
      name: 'Most viewed entries',
      description: 'Which entries people open most.',
      series: [{ event: 'encyclopedia_entry_viewed', filters: [{ key: 'target_type', value: 'database' }] }],
      breakdown: 'slug',
      display: 'table',
      days: 30,
    }

    expect(insightBody(chart, 42)).toEqual({
      name: 'Most viewed entries',
      description: 'Which entries people open most.',
      dashboards: [42],
      query: {
        kind: 'InsightVizNode',
        source: {
          kind: 'TrendsQuery',
          series: [
            {
              kind: 'EventsNode',
              event: 'encyclopedia_entry_viewed',
              name: 'encyclopedia_entry_viewed',
              math: 'total',
              properties: [{ key: 'target_type', value: 'database', operator: 'exact', type: 'event' }],
            },
          ],
          interval: 'day',
          dateRange: { date_from: '-30d' },
          breakdownFilter: { breakdown: 'slug', breakdown_type: 'event' },
          trendsFilter: { display: 'ActionsTable' },
        },
      },
    })
  })

  it('leaves out the breakdown and filters when a chart has none', () => {
    const chart: Chart = {
      kind: 'trend',
      name: 'Searches',
      description: 'Searches per day.',
      series: [{ event: 'search_performed' }],
      display: 'line',
      days: 90,
    }

    const source = (insightBody(chart, 1).query as { source: Record<string, unknown> }).source
    expect(source).not.toHaveProperty('breakdownFilter')
    expect(source.trendsFilter).toEqual({ display: 'ActionsLineGraph' })
    expect((source.series as Record<string, unknown>[])[0]).not.toHaveProperty('properties')
  })

  it('turns a funnel into a PostHog funnels insight', () => {
    const chart: Chart = {
      kind: 'funnel',
      name: 'Search to click',
      description: 'How often a search leads to a click.',
      steps: [{ event: 'search_performed' }, { event: 'search_result_clicked' }],
      windowDays: 1,
      days: 30,
    }

    expect(insightBody(chart, 7).query).toEqual({
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          { kind: 'EventsNode', event: 'search_performed', name: 'search_performed' },
          { kind: 'EventsNode', event: 'search_result_clicked', name: 'search_result_clicked' },
        ],
        dateRange: { date_from: '-30d' },
        funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: 'day' },
      },
    })
  })
})

describe('cohortBody', () => {
  it('turns "did this N times within X days" rules into a behavioural cohort', () => {
    const cohort: Cohort = {
      name: 'Community contributors',
      description: 'People who comment or post photos.',
      anyOf: [[{ event: 'comment_posted', atLeast: 3, withinDays: 365 }], [{ event: 'photo_uploaded', atLeast: 3, withinDays: 365 }]],
    }

    expect(cohortBody(cohort)).toEqual({
      name: 'Community contributors',
      description: 'People who comment or post photos.',
      is_static: false,
      filters: {
        properties: {
          type: 'OR',
          values: [
            {
              type: 'AND',
              values: [
                {
                  type: 'behavioral',
                  key: 'comment_posted',
                  value: 'performed_event_multiple',
                  event_type: 'events',
                  operator: 'gte',
                  operator_value: 3,
                  time_value: 365,
                  time_interval: 'day',
                  negation: false,
                },
              ],
            },
            {
              type: 'AND',
              values: [
                {
                  type: 'behavioral',
                  key: 'photo_uploaded',
                  value: 'performed_event_multiple',
                  event_type: 'events',
                  operator: 'gte',
                  operator_value: 3,
                  time_value: 365,
                  time_interval: 'day',
                  negation: false,
                },
              ],
            },
          ],
        },
      },
    })
  })

  it('uses a plain "did this" rule when once is enough', () => {
    const cohort: Cohort = {
      name: 'Active this week',
      description: 'Visited in the last 7 days.',
      anyOf: [[{ event: '$pageview', atLeast: 1, withinDays: 7 }]],
    }

    const [group] = (cohortBody(cohort).filters as { properties: { values: { values: Record<string, unknown>[] }[] } }).properties.values
    expect(group.values[0]).toEqual({
      type: 'behavioral',
      key: '$pageview',
      value: 'performed_event',
      event_type: 'events',
      time_value: 7,
      time_interval: 'day',
      negation: false,
    })
  })
})
