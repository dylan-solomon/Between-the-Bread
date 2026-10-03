export type Page = {
  tags: string[]
  search?: { description: string; canonical: string; structuredData?: string }
  content?: { html: string; path: string; data: unknown }
}
