import { expect, test } from '@playwright/test'

test('readability settings persist without overflow and keep keyboard focus visible @critical', async ({ page }, testInfo) => {
  test.skip(!['mobile-390', 'desktop-1280'].includes(testInfo.project.name), 'Representative mobile and desktop breakpoints cover the shared settings UI.')

  await page.goto('/')
  await page.getByRole('button', { name: /В путь/ }).click()
  await page.getByRole('button', { name: /Пропустить/ }).last().click()

  const settings = page.getByRole('region', { name: 'Настройки читаемости' })
  await expect(settings).toBeVisible()
  await settings.getByLabel('Размер текста').selectOption('xlarge')
  await settings.getByRole('button', { name: 'Высокий контраст' }).click()
  await settings.getByRole('button', { name: 'Меньше анимации' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'xlarge')
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  await expect(settings.getByRole('button', { name: 'Высокий контраст' })).toHaveAttribute('aria-pressed', 'true')
  await expect(settings.getByRole('button', { name: 'Меньше анимации' })).toHaveAttribute('aria-pressed', 'true')

  await settings.getByLabel('Размер текста').focus()
  await expect(settings.getByLabel('Размер текста')).toBeFocused()
  const focusOutline = await settings.getByLabel('Размер текста').evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(focusOutline).not.toBe('none')

  const animationPolicy = await page.evaluate(() => {
    const element = document.querySelector('.hub-art')
    if (!element) return null
    const style = getComputedStyle(element)
    const milliseconds = (value: string) => value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000
    return { animationMs: milliseconds(style.animationDuration), transitionMs: milliseconds(style.transitionDuration) }
  })
  expect(animationPolicy?.animationMs).toBeLessThanOrEqual(0.011)
  expect(animationPolicy?.transitionMs).toBeLessThanOrEqual(0.011)

  const pageSize = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(pageSize.scroll).toBeLessThanOrEqual(pageSize.client)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'xlarge')
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true')
  await expect(page.getByRole('region', { name: 'Настройки читаемости' }).getByLabel('Размер текста')).toHaveValue('xlarge')
})
