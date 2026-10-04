export class TooManyRequestsError extends Error {}

const SLOW_DOWN = "You're going a bit fast. Please wait a moment and try again."

const serverMessage = async (response: Response): Promise<string | undefined> => {
  const body = (await response.json().catch(() => ({}))) as { error?: { message?: unknown } }
  return typeof body.error?.message === 'string' ? body.error.message : undefined
}

export const failureFrom = async (response: Response, context: string): Promise<Error> =>
  response.status === 429
    ? new TooManyRequestsError((await serverMessage(response)) ?? SLOW_DOWN)
    : new Error(`${context}: ${String(response.status)}`)

export const messageFor = (error: unknown, fallback: string): string =>
  error instanceof TooManyRequestsError ? error.message : fallback
