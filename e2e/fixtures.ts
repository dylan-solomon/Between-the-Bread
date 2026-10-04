import AxeBuilder from '@axe-core/playwright'
import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export const test = base.extend<{ quietAnalytics: undefined }>({
  quietAnalytics: [
    async ({ page }, use) => {
      await page.route(/posthog\.com/, (route) => route.abort())
      await use(undefined)
    },
    { auto: true },
  ],
})

export { expect }

export type Problem = { rule: string; problem: string; where: string[] }

export const accessibilityProblems = async (page: Page): Promise<Problem[]> => {
  await page.waitForLoadState('networkidle')
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
  return results.violations.map((violation) => ({
    rule: violation.id,
    problem: violation.help,
    where: violation.nodes.map((node) => JSON.stringify(node.target)),
  }))
}

export const scrollsSideways = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
