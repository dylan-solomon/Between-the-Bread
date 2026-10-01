const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSlug = (value: unknown): value is string =>
  typeof value === 'string' && SLUG_PATTERN.test(value)

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
