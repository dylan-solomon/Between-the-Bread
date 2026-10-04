import { accessibilityProblems, expect, scrollsSideways, test } from './fixtures'

test.describe('site search', () => {
  test('finds sandwiches from the header with only the keyboard', async ({ page }) => {
    await page.goto('/sandwiches')
    const opener = page.getByRole('banner').getByRole('button', { name: 'Search' })
    await opener.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Search' })
    const box = dialog.getByRole('searchbox', { name: 'Search the site' })
    await expect(box).toBeFocused()
    await box.fill('reuben')
    await expect(dialog.getByRole('link', { name: /Reuben/ }).first()).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])

    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('link', { name: 'See all results for "reuben"' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(box).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('shows every result on the search page', async ({ page }) => {
    await page.goto('/sandwiches')
    await page.getByRole('banner').getByRole('button', { name: 'Search' }).click()
    await page.getByRole('searchbox', { name: 'Search the site' }).fill('reuben')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=reuben/)
    await expect(page.getByRole('heading', { level: 1, name: 'Results for "reuben"' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: /Reuben/ }).first()).toBeVisible()
    expect(await accessibilityProblems(page)).toEqual([])
    expect(await scrollsSideways(page)).toBe(false)
  })
})
