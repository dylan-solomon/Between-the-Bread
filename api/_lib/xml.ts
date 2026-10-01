const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }

export const escapeXml = (value: string): string => value.replace(/[&<>"']/g, (character) => ESCAPES[character])
