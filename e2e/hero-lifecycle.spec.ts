import { expect, test } from '@playwright/test'

test('a hero can start, fight, reach a terminal run state and begin again @critical', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet-768', 'One full deterministic lifecycle is sufficient across the shared engine.')
  test.setTimeout(60_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: /В путь/ }).click()
  await page.locator('.tutorial-coach button').click()
  await page.getByRole('button', { name: /Багряная клятва/ }).click()
  await page.getByLabel('Сложность похода').fill('10')
  await page.getByRole('button', { name: /Начать поход/ }).click()

  let terminal: 'death' | 'victory' | null = null
  for (let step = 0; step < 300 && !terminal; step += 1) {
    const notice = page.locator('.notice')
    if (await notice.isVisible()) await notice.click()
    if (await page.locator('.death-screen').isVisible()) { terminal = 'death'; break }
    if (await page.locator('.complete-encounter').isVisible()) { terminal = 'victory'; break }
    if (await page.locator('.reward-encounter').isVisible()) {
      const take = page.getByRole('button', { name: /Забрать выбранное/ })
      if (await take.isVisible()) await take.click()
      else await page.getByRole('button', { name: /Оставить/ }).click()
      continue
    }
    if (await page.locator('.event-encounter').isVisible()) {
      const proceed = page.getByRole('button', { name: /Продолжить путь/ })
      if (await proceed.isVisible()) await proceed.click()
      else await page.locator('.event-choices button').first().click()
      continue
    }
    if (await page.locator('.combat-encounter').isVisible()) {
      const attack = page.locator('.combat-controls .choice-group').nth(0).locator('button:not([disabled])').first()
      const block = page.locator('.combat-controls .choice-group').nth(1).locator('button:not([disabled])').first()
      if (await attack.isVisible()) await attack.click()
      if (await block.isVisible()) await block.click()
      const quick = page.locator('.technique-group button:not([disabled])').first()
      if (await quick.isVisible()) await quick.click()
      await page.getByRole('button', { name: /В бой/ }).click()
      continue
    }
    if (await page.locator('.node-gate').isVisible()) {
      const enter = page.getByRole('button', { name: /Войти и закрыть развилку/ })
      if (await enter.isVisible()) await enter.click()
      else await page.locator('.path-options button').first().click()
      continue
    }
    await page.waitForTimeout(50)
  }

  expect(terminal).not.toBeNull()
  if (terminal === 'death') {
    await expect(page.getByText('ИСТОРИЯ ЗАВЕРШЕНА')).toBeVisible()
    await expect(page.locator('.run-debrief')).toBeVisible()
    await page.getByRole('button', { name: /Новый боец/ }).click()
    await expect(page.locator('.hub-screen')).toBeVisible()
  } else {
    await expect(page.locator('.run-debrief')).toBeVisible()
    await page.getByRole('button', { name: /Вернуться в убежище/ }).click()
    await expect(page.locator('.hub-screen')).toBeVisible()
  }
  expect(consoleErrors).toEqual([])
})
