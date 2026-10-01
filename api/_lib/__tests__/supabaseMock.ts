import { expect } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export type Result = { data: unknown; error: unknown; count?: number | null }
export type Call = { method: string; args: unknown[] }

export const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: {},
    ...overrides,
  }) as unknown as VercelRequest

export type MockRes = VercelResponse & { _status: number; _json: unknown; _headers: Record<string, string> }

export const makeRes = (): MockRes => {
  const res = {
    _status: 0,
    _json: null as unknown,
    _headers: {} as Record<string, string>,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
    setHeader(name: string, value: string) { res._headers[name] = value; return res },
  }
  return res as unknown as MockRes
}

export const profileBranch = (isAdmin: boolean) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) }) }),
})

const chain = (result: Result, calls: Call[]): unknown => {
  const proxy: unknown = new Proxy({}, {
    get: (_target, method: string) => {
      if (method === 'then') return (resolve: (value: Result) => unknown) => resolve(result)
      return (...args: unknown[]) => {
        calls.push({ method, args })
        return proxy
      }
    },
  })
  return proxy
}

export const queueTableResults = (
  mockFrom: { mockImplementation: (implementation: (table: string) => unknown) => unknown },
  results: Result[],
) => {
  const calls: Call[] = []
  const queue = [...results]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileBranch(true)
    calls.push({ method: 'from', args: [table] })
    return chain(queue.shift() ?? { data: null, error: null }, calls)
  })
  return calls
}

export const callsOf = (calls: Call[], method: string): Call[] => calls.filter((call) => call.method === method)

export const errorOf = (res: { _json: unknown }): { code: string; message: string } =>
  (res._json as { error: { code: string; message: string } }).error

export const metaOf = (res: { _json: unknown }): Record<string, unknown> =>
  (res._json as { meta: Record<string, unknown> }).meta

export const dataOf = (res: { _json: unknown }): unknown => (res._json as { data: unknown }).data

export const anyString: unknown = expect.any(String)
