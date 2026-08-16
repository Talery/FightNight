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

async function expectNoHorizontalPageOverflow(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1)
}

async function expectControlsInsidePanel(page: Page): Promise<void> {
  const geometry = await page.locator('.combat-controls').evaluate((panel) => {
    const parent = panel.getBoundingClientRect()
    return [...panel.querySelectorAll('button')]
      .filter((button) => {
        const style = getComputedStyle(button)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map((button) => {
        const rect = button.getBoundingClientRect()
        return {
          name: button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          inside: rect.left >= parent.left - 1 && rect.right <= parent.right + 1 && rect.top >= parent.top - 1 && rect.bottom <= parent.bottom + 1,
          textFits: button.scrollWidth <= button.clientWidth + 2 && button.scrollHeight <= button.clientHeight + 2,
        }
      })
  })
  expect(geometry.length).toBeGreaterThan(0)
  expect(geometry.filter(({ inside, textFits }) => !inside || !textFits)).toEqual([])
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

  await expectControlsInsidePanel(page)
  await expectNoHorizontalPageOverflow(page)
  expect(consoleErrors).toEqual([])
})

test('combat inventory remains usable inside the mobile viewport @critical', async ({ page }) => {
  await enterFirstCombat(page)
  await page.getByRole('button', { name: 'Сумка', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /Арсенал бойца/ })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1)
  expect(box!.y + box!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1)
  await page.getByRole('button', { name: 'Закрыть сумку' }).click()
  await expect(dialog).toBeHidden()
})

test('hub navigation and arsenal stay inside every supported viewport @critical', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /В путь/ }).click()
  await page.getByRole('button', { name: /Пропустить/ }).last().click()
  await expectNoHorizontalPageOverflow(page)

  const viewport = page.viewportSize()
  if ((viewport?.width ?? 1000) <= 470) {
    const navButtons = page.getByRole('navigation', { name: 'Главное меню' }).getByRole('button')
    await expect(navButtons).toHaveCount(5)
    for (let index = 0; index < 5; index += 1) {
      const box = await navButtons.nth(index).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1)
    }
  }

  const arsenal = (viewport?.width ?? 1000) <= 800
    ? page.getByRole('navigation', { name: 'Главное меню' }).getByRole('button', { name: 'Арсенал', exact: true })
    : page.getByRole('button', { name: /Открыть арсенал/ })
  await arsenal.click()
  const dialog = page.getByRole('dialog', { name: /Арсенал бойца/ })
  await expect(dialog).toBeVisible()
  const dialogBox = await dialog.boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0)
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1)
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0)
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1)
})
