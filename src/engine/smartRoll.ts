import type { CompatGroup, CompatMatrixRow, Ingredient } from '@/types'

const lookupAffinity = (
  a: CompatGroup,
  b: CompatGroup,
  matrix: CompatMatrixRow[],
): number => {
  if (a === b) return 1.0
  const row = matrix.find(
    (r) => (r.group_a === a && r.group_b === b) || (r.group_a === b && r.group_b === a),
  )
  return row?.affinity ?? 0.5
}

export const buildCompatWeights = (
  pool: Ingredient[],
  priorGroups: CompatGroup[],
  matrix: CompatMatrixRow[],
): number[] => {
  const floor = 0.1 / pool.length
  return pool.map((ingredient) => {
    if (priorGroups.length === 0) return 1.0
    const avg =
      priorGroups.reduce(
        (sum, g) => sum + lookupAffinity(ingredient.compat_group, g, matrix),
        0,
      ) / priorGroups.length
    return Math.max(avg, floor)
  })
}

export const weightedSample = <T>(items: T[], weights: number[]): T => {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let cursor = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    cursor -= weights[i] ?? 0
    if (cursor <= 0) return items[i]
  }
  return items[items.length - 1]
}
