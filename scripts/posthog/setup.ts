import type { Chart, Cohort, Dashboard } from './definitions'
import { cohortBody, insightBody } from './toPosthog'

export type Http = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<{ status: number; body: unknown }>

export type Report = { created: number; skipped: number; failed: { name: string; reason: string }[]; blocked: boolean }

type Options = { http: Http; projectId: string; cohorts: Cohort[]; dashboards: Dashboard[] }

type Outcome =
  | { kind: 'created'; id: number | null }
  | { kind: 'skipped' }
  | { kind: 'failed'; name: string; reason: string }
  | { kind: 'blocked' }

type Item = Record<string, unknown>

const isItem = (value: unknown): value is Item => typeof value === 'object' && value !== null

const listOf = (body: unknown): Item[] => {
  const results = isItem(body) && 'results' in body ? body.results : body
  return Array.isArray(results) ? (results as unknown[]).filter(isItem) : []
}

const detailOf = (body: unknown): string =>
  isItem(body) && typeof body.detail === 'string' ? body.detail : JSON.stringify(body)

const idOf = (body: unknown): number | null => (isItem(body) && typeof body.id === 'number' ? body.id : null)

const inSequence = async <T, R>(items: T[], run: (item: T) => Promise<R[]>): Promise<R[]> =>
  items.reduce<Promise<R[]>>(async (done, item) => {
    const previous = await done
    if (previous.some((outcome) => isItem(outcome) && outcome.kind === 'blocked')) return previous
    return [...previous, ...(await run(item))]
  }, Promise.resolve([]))

const summarise = (outcomes: Outcome[]): Report => ({
  created: outcomes.filter((outcome) => outcome.kind === 'created').length,
  skipped: outcomes.filter((outcome) => outcome.kind === 'skipped').length,
  failed: outcomes.flatMap((outcome) => (outcome.kind === 'failed' ? [{ name: outcome.name, reason: outcome.reason }] : [])),
  blocked: outcomes.some((outcome) => outcome.kind === 'blocked'),
})

export const runSetup = async ({ http, projectId, cohorts, dashboards }: Options): Promise<Report> => {
  const base = `/api/projects/${projectId}`

  const create = async (path: string, body: Item): Promise<Outcome> => {
    const response = await http('POST', path, body)
    if (response.status === 403 && detailOf(response.body).includes('personal API key')) return { kind: 'blocked' }
    if (response.status >= 300) {
      return { kind: 'failed', name: String(body.name), reason: `${String(response.status)} ${detailOf(response.body)}` }
    }
    return { kind: 'created', id: idOf(response.body) }
  }

  const tileNames = async (dashboardId: number): Promise<Set<string>> => {
    const { body } = await http('GET', `${base}/dashboards/${String(dashboardId)}/`)
    const tiles = isItem(body) ? body.tiles : []
    return new Set(
      listOf(tiles).flatMap((tile) => (isItem(tile.insight) && typeof tile.insight.name === 'string' ? [tile.insight.name] : [])),
    )
  }

  const existingCohorts = new Set(
    listOf((await http('GET', `${base}/cohorts/?limit=500`)).body).flatMap((item) => (typeof item.name === 'string' ? [item.name] : [])),
  )
  const existingDashboards = new Map(
    listOf((await http('GET', `${base}/dashboards/?limit=500`)).body).flatMap((item) =>
      typeof item.name === 'string' && typeof item.id === 'number' ? [[item.name, item.id] as const] : [],
    ),
  )

  const cohortOutcomes = await inSequence(cohorts, async (cohort) =>
    existingCohorts.has(cohort.name) ? [{ kind: 'skipped' } as Outcome] : [await create(`${base}/cohorts/`, cohortBody(cohort))],
  )

  const chartOutcomes = (dashboardId: number, existing: Set<string>) => async (chart: Chart): Promise<Outcome[]> =>
    existing.has(chart.name) ? [{ kind: 'skipped' }] : [await create(`${base}/insights/`, insightBody(chart, dashboardId))]

  if (cohortOutcomes.some((outcome) => outcome.kind === 'blocked')) return summarise(cohortOutcomes)

  const dashboardOutcomes = await inSequence(dashboards, async (dashboard): Promise<Outcome[]> => {
    const knownId = existingDashboards.get(dashboard.name)
    if (knownId !== undefined) {
      return [{ kind: 'skipped' }, ...(await inSequence(dashboard.charts, chartOutcomes(knownId, await tileNames(knownId))))]
    }
    const made = await create(`${base}/dashboards/`, { name: dashboard.name, description: dashboard.description })
    if (made.kind !== 'created' || made.id === null) return [made]
    return [made, ...(await inSequence(dashboard.charts, chartOutcomes(made.id, new Set())))]
  })

  return summarise([...cohortOutcomes, ...dashboardOutcomes])
}
