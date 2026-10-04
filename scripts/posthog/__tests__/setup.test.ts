import { describe, it, expect } from 'vitest'
import { runSetup } from '../setup'
import type { Http } from '../setup'
import type { Cohort, Dashboard } from '../definitions'

type Call = { method: string; path: string; body?: unknown }

const cohorts: Cohort[] = [
  { name: 'Raters', description: 'r', anyOf: [[{ event: 'sandwich_rated', atLeast: 5, withinDays: 365 }]] },
  { name: 'Explorers', description: 'e', anyOf: [[{ event: 'encyclopedia_entry_viewed', atLeast: 10, withinDays: 365 }]] },
]

const trend = (name: string) => ({
  kind: 'trend' as const,
  name,
  description: name,
  series: [{ event: 'search_performed' }],
  display: 'line' as const,
  days: 30,
})

const dashboards: Dashboard[] = [
  { name: 'Search', description: 's', charts: [trend('Searches'), trend('Top search words')] },
  { name: 'Blog', description: 'b', charts: [trend('Post views')] },
]

type Existing = { cohorts?: string[]; dashboards?: { id: number; name: string; tiles: string[] }[] }

const fakeHttp = (existing: Existing = {}, override?: (call: Call) => { status: number; body: unknown } | undefined) => {
  const calls: Call[] = []
  let nextId = 100
  const http: Http = (method, path, body) => {
    const call = { method, path, body }
    calls.push(call)
    const overridden = override?.(call)
    if (overridden !== undefined) return Promise.resolve(overridden)
    if (method === 'GET' && path.startsWith('/api/projects/9/cohorts/')) {
      return Promise.resolve({ status: 200, body: { results: (existing.cohorts ?? []).map((name) => ({ name })) } })
    }
    if (method === 'GET' && path.startsWith('/api/projects/9/dashboards/?')) {
      return Promise.resolve({ status: 200, body: { results: (existing.dashboards ?? []).map(({ id, name }) => ({ id, name })) } })
    }
    const detail = /^\/api\/projects\/9\/dashboards\/(\d+)\/$/.exec(path)
    if (method === 'GET' && detail !== null) {
      const dashboard = existing.dashboards?.find((candidate) => candidate.id === Number(detail[1]))
      return Promise.resolve({ status: 200, body: { tiles: (dashboard?.tiles ?? []).map((name) => ({ insight: { name } })) } })
    }
    nextId += 1
    return Promise.resolve({ status: 201, body: { id: nextId } })
  }
  return { http, calls }
}

const created = (calls: Call[], path: string): string[] =>
  calls.filter((call) => call.method === 'POST' && call.path === path).map((call) => (call.body as { name: string }).name)

describe('runSetup', () => {
  it('creates every user group, dashboard and chart in an empty project', async () => {
    const { http, calls } = fakeHttp()

    const report = await runSetup({ http, projectId: '9', cohorts, dashboards })

    expect(created(calls, '/api/projects/9/cohorts/')).toEqual(['Raters', 'Explorers'])
    expect(created(calls, '/api/projects/9/dashboards/')).toEqual(['Search', 'Blog'])
    expect(created(calls, '/api/projects/9/insights/')).toEqual(['Searches', 'Top search words', 'Post views'])
    expect(report).toEqual({ created: 7, skipped: 0, failed: [], blocked: false })
  })

  it('puts each chart on its own dashboard', async () => {
    const { http, calls } = fakeHttp()

    await runSetup({ http, projectId: '9', cohorts: [], dashboards })

    const insightPosts = calls.filter((call) => call.path === '/api/projects/9/insights/')
    const searchDashboardId = 101
    expect((insightPosts[0].body as { dashboards: number[] }).dashboards).toEqual([searchDashboardId])
  })

  it('skips anything that already exists, so it is safe to run again', async () => {
    const { http, calls } = fakeHttp({
      cohorts: ['Raters'],
      dashboards: [{ id: 5, name: 'Search', tiles: ['Searches'] }],
    })

    const report = await runSetup({ http, projectId: '9', cohorts, dashboards })

    expect(created(calls, '/api/projects/9/cohorts/')).toEqual(['Explorers'])
    expect(created(calls, '/api/projects/9/dashboards/')).toEqual(['Blog'])
    expect(created(calls, '/api/projects/9/insights/')).toEqual(['Top search words', 'Post views'])
    expect(report).toMatchObject({ created: 4, skipped: 3 })
  })

  it('stops and reports when PostHog refuses personal API keys', async () => {
    const { http, calls } = fakeHttp({}, (call) =>
      call.method === 'POST' && call.path === '/api/projects/9/insights/'
        ? { status: 403, body: { detail: 'This action does not support personal API key access' } }
        : undefined,
    )

    const report = await runSetup({ http, projectId: '9', cohorts, dashboards })

    expect(report.blocked).toBe(true)
    expect(created(calls, '/api/projects/9/insights/')).toEqual(['Searches'])
  })

  it('stops before the dashboards when user groups are refused', async () => {
    const { http, calls } = fakeHttp({}, (call) =>
      call.method === 'POST' && call.path === '/api/projects/9/cohorts/'
        ? { status: 403, body: { detail: 'This action does not support personal API key access' } }
        : undefined,
    )

    const report = await runSetup({ http, projectId: '9', cohorts, dashboards })

    expect(report.blocked).toBe(true)
    expect(created(calls, '/api/projects/9/cohorts/')).toEqual(['Raters'])
    expect(created(calls, '/api/projects/9/dashboards/')).toEqual([])
  })

  it('keeps going past an item PostHog rejects and says why', async () => {
    const { http } = fakeHttp({}, (call) =>
      call.method === 'POST' && (call.body as { name?: string } | undefined)?.name === 'Raters'
        ? { status: 400, body: { detail: 'Invalid filters' } }
        : undefined,
    )

    const report = await runSetup({ http, projectId: '9', cohorts, dashboards })

    expect(report.failed).toEqual([{ name: 'Raters', reason: '400 Invalid filters' }])
    expect(report.created).toBe(6)
  })
})
