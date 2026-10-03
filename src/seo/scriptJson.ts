export const scriptJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c')
