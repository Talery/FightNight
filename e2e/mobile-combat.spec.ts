import { expect, test, type Page } from '@playwright/test'

async function enterFirstCombat(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /В путь/ }).click()
  await page.getByRole('button', { name: /Пропустить/ }).last().click()
  await page.getByRole('button', { name: /Железная клятва/ }).click()
  await page.getByRole('button', { name: /Начать поход/ }).click()
  await page.getByRole('button', { name: /Засада/ }).first().click()
  await page.getByRole('button', { name: /Войти и закрыть развилку/ }).click()
  await expect(page.getByRole('button', { name: /В бой/ })).toBeVisible()
}

test('tutorial supports the three-step keyboard flow @critical', async ({ page }) => {
  await page.goto('/')
  const journey = page.getByRole('button', { name: /В путь/ })
  if (await journey.isVisible()) await journey.click()
  await expect(page.locator('.tutorial-coach')).toContainText('Шаг 1/3')
  await page.locator('.choice-group:not(.tutorial-locked) button').first().click()
  await page.keyboard.press('Enter')
  await expect(page.locator('.tutorial-coach')).toContainText('Шаг 2/3')
  await page.locator('.choice-group:not(.tutorial-locked) button').first().click()
  await page.keyboard.press('Enter')
  await expect(page.locator('.tutorial-coach')).toContainText('Шаг 3/3')
  await page.locator('.technique-group button').nth(1).click()
  await page.keyboard.press('Enter')
  await expect(page.locator('.tutorial-coach, .tutorial-rewards')).toContainText(/Основы пройдены|Статус появился|ОБУЧЕНИЕ ЗАВЕРШЕНО/)
})

test('mobile combat keeps the decision loop in one viewport @critical', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await enterFirstCombat(page)

  const health = page.getByRole('progressbar', { name: 'Кровь' })
  await expect(health).toHaveCount(2)
  await expect(health.first()).toBeVisible()
  await expect(health.last()).toBeVisible()
  await expect(page.getByText(/Угроза:/)).toBeVisible()

  const fight = page.getByRole('button', { name: /В бой/ })
  const fightBox = await fight.boundingBox()
  expect(fightBox).not.toBeNull()
  expect(fightBox!.y + fightBox!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1)

  const pageSize = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(pageSize.scroll).toBeLessThanOrEqual(pageSize.client)
  expect(consoleErrors).toEqual([])
})

test('combat inventory remains usable inside the mobile viewport @critical', async ({ page }) => {
  await enterFirstCombat(page)
  await page.getByRole('button', { name: 'Сумка', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /Сумка/ })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1)
  await page.getByRole('button', { name: 'Закрыть сумку' }).click()
  await expect(dialog).toBeHidden()
})
