type ApiSuccessResponse<T> = {
  data: T
  meta: { timestamp: string } & Record<string, unknown>
}

type ApiErrorResponse = {
  error: { code: string; message: string; status: number }
}

export const ok = <T>(
  data: T,
  extraMeta: Record<string, unknown> = {},
): ApiSuccessResponse<T> => ({
  data,
  meta: { timestamp: new Date().toISOString(), ...extraMeta },
})

export const err = (
  code: string,
  message: string,
  status: number,
): ApiErrorResponse => ({
  error: { code, message, status },
})
