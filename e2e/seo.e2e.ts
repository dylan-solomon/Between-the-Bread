import type { APIRequestContext } from '@playwright/test'
import { expect, test } from './fixtures'

const firstLink = async (request: APIRequestContext, listPath: string, prefix: string): Promise<string> => {
  const html = await (await request.get(listPath)).text()
  const match = new RegExp(`href="(${prefix}[a-z0-9-]+)"`).exec(html)
  if (match === null) throw new Error(`No ${prefix} link found on ${listPath}`)
  return match[1]
}

test.describe('what search engines receive', () => {
  test.skip(({ baseURL }) => baseURL?.startsWith('http://localhost') ?? false, 'Pages are only written in advance on Vercel')

  for (const [listPath, prefix] of [['/sandwiches', '/sandwiches/'], ['/community', '/community/'], ['/blog', '/blog/']] as const) {
    test(`${listPath} and its pages arrive with their content already written`, async ({ request, baseURL }) => {
      const detailPath = await firstLink(request, listPath, prefix)

      for (const path of [listPath, detailPath]) {
        const response = await request.get(path)
        const html = await response.text()
        expect(response.status(), path).toBe(200)
        expect(html, path).toMatch(/<h1[^>]*>[^<]+/)
        expect(html, path).toContain(`<link rel="canonical" href="${String(baseURL)}${path}"`)
        expect(html, path).toMatch(/<meta name="description" content="[^"]+"/)
      }
    })
  }

  test('missing pages say so and ask not to be listed', async ({ request }) => {
    for (const path of ['/sandwiches/no-such-sandwich-e2e', '/blog/no-such-post-e2e', '/community/no-such-sandwich-e2e']) {
      const response = await request.get(path)
      expect(response.status(), path).toBe(404)
      expect(await response.text(), path).toContain('noindex')
    }
  })

  test('the sitemap lists the encyclopedia, community and blog', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    const sitemap = await (await request.get('/sitemap.xml')).text()

    expect(robots).toContain('Sitemap:')
    expect(sitemap).toContain('/sandwiches/')
    expect(sitemap).toContain('/community')
    expect(sitemap).toContain('/blog/')
  })
})
