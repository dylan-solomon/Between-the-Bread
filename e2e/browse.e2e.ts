import { accessibilityProblems, expect, scrollsSideways, test } from './fixtures'

test.describe('encyclopedia', () => {
  test('lists the classic sandwiches and opens one', async ({ page }) => {
    await page.goto('/sandwiches')
    await expect(page.getByRole('heading', { level: 1, name: 'Sandwich Encyclopedia' })).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)

    const first = page.getByRole('main').getByRole('heading', { level: 2 }).first()
    const name = (await first.textContent()) ?? ''
    await first.click()

    await expect(page).toHaveURL(/\/sandwiches\/[a-z0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Ingredients' })).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)
  })
})

test.describe('community leaderboard', () => {
  test('ranks community sandwiches, re-sorts them and opens one', async ({ page }) => {
    await page.goto('/community')
    await expect(page.getByRole('heading', { level: 1, name: 'Community Leaderboard' })).toBeVisible()
    const first = page.getByRole('main').getByRole('heading', { level: 2 }).first()
    await expect(first).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)

    await page.getByRole('group', { name: 'Sort by' }).getByRole('button').last().click()
    await expect(page).toHaveURL(/sort=/)
    await expect(first).toBeVisible()

    const name = (await first.textContent()) ?? ''
    await first.click()

    await expect(page).toHaveURL(/\/community\/[a-z0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)
  })
})

test.describe('blog', () => {
  test('lists posts and opens one', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1, name: 'Blog' })).toBeVisible()
    const first = page.getByRole('main').getByRole('heading', { level: 2 }).first().getByRole('link')
    await expect(first).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)

    const title = (await first.textContent()) ?? ''
    await first.click()

    await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1, name: title.trim() })).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)
  })
})

test.describe('other pages', () => {
  for (const path of ['/', '/about', '/privacy', '/login', '/signup', '/does-not-exist']) {
    test(`${path} has no accessibility problems and fits the screen`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('banner')).toBeVisible()

      expect(await accessibilityProblems(page)).toEqual([])
      expect(await scrollsSideways(page)).toBe(false)
    })
  }
})
