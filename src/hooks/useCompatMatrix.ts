import { useState, useEffect } from 'react'
import type { CompatMatrixRow } from '@/types'
import { fetchCompatMatrix } from '@/api/compatMatrix'

type UseCompatMatrixResult = {
  matrix: CompatMatrixRow[]
  loading: boolean
}

export const useCompatMatrix = (): UseCompatMatrixResult => {
  const [matrix, setMatrix] = useState<CompatMatrixRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchCompatMatrix()
      .then((rows) => {
        if (!cancelled) setMatrix(rows)
      })
      .catch((e: unknown) => {
        if (!cancelled) console.error('Failed to load compat matrix:', e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { matrix, loading }
}
