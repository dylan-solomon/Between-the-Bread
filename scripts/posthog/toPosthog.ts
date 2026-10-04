import type { Chart, Cohort, CohortRule, Series } from './definitions'

const DISPLAYS = { line: 'ActionsLineGraph', bar: 'ActionsBar', table: 'ActionsTable' } as const

const eventsNode = ({ event, filters }: Series, withTotal: boolean) => ({
  kind: 'EventsNode',
  event,
  name: event,
  ...(withTotal ? { math: 'total' } : {}),
  ...(filters === undefined || filters.length === 0
    ? {}
    : { properties: filters.map(({ key, value }) => ({ key, value, operator: 'exact', type: 'event' })) }),
})

const querySource = (chart: Chart) => {
  const dateRange = { date_from: `-${String(chart.days)}d` }
  if (chart.kind === 'funnel') {
    return {
      kind: 'FunnelsQuery',
      series: chart.steps.map((step) => eventsNode(step, false)),
      dateRange,
      funnelsFilter: { funnelWindowInterval: chart.windowDays, funnelWindowIntervalUnit: 'day' },
    }
  }
  return {
    kind: 'TrendsQuery',
    series: chart.series.map((series) => eventsNode(series, true)),
    interval: 'day',
    dateRange,
    ...(chart.breakdown === undefined ? {} : { breakdownFilter: { breakdown: chart.breakdown, breakdown_type: 'event' } }),
    trendsFilter: { display: DISPLAYS[chart.display] },
  }
}

export const insightBody = (chart: Chart, dashboardId: number): Record<string, unknown> => ({
  name: chart.name,
  description: chart.description,
  dashboards: [dashboardId],
  query: { kind: 'InsightVizNode', source: querySource(chart) },
})

const behavioralRule = ({ event, atLeast, withinDays }: CohortRule) => ({
  type: 'behavioral',
  key: event,
  value: atLeast > 1 ? 'performed_event_multiple' : 'performed_event',
  event_type: 'events',
  ...(atLeast > 1 ? { operator: 'gte', operator_value: atLeast } : {}),
  time_value: withinDays,
  time_interval: 'day',
  negation: false,
})

export const cohortBody = (cohort: Cohort): Record<string, unknown> => ({
  name: cohort.name,
  description: cohort.description,
  is_static: false,
  filters: {
    properties: {
      type: 'OR',
      values: cohort.anyOf.map((group) => ({ type: 'AND', values: group.map(behavioralRule) })),
    },
  },
})
