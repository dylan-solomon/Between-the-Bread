import type { CompatMatrixRow } from '@/types'

type ApiResponse = {
  data: CompatMatrixRow[]
  meta: { timestamp: string; row_count: number }
}

export const fetchCompatMatrix = async (): Promise<CompatMatrixRow[]> => {
  const response = await fetch('/api/compat-matrix')
  if (!response.ok) {
    throw new Error(`Failed to fetch compat matrix: ${String(response.status)}`)
  }

  const body = (await response.json()) as unknown
  const { data } = body as ApiResponse
  return data
}
