type FieldKind = 'string' | 'number' | 'array' | 'object'

const matches = (value: unknown, kind: FieldKind): boolean => {
  if (kind === 'array') return Array.isArray(value)
  if (kind === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value)
  return typeof value === kind
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const hasFields = (value: unknown, fields: Record<string, FieldKind>): value is Record<string, unknown> =>
  isRecord(value) && Object.entries(fields).every(([field, kind]) => matches(value[field], kind))
