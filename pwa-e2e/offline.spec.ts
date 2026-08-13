import { expect, test } from '@playwright/test'

test('production PWA keeps a saved campaign playable offline @critical', async ({ context, page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page).toHaveTitle(/Пепельный Круг/)

  const cdp = await context.newCDPSession(page)
  const appManifest = await cdp.send('Page.getAppManifest') as { errors: Array<{ message: string }>; data?: string }
  expect(appManifest.errors).toEqual([])
  expect(JSON.parse(appManifest.data ?? '{}')).toMatchObject({ name: 'Пепельный Круг', display: 'standalone', start_url: '/' })

  const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
  expect(serviceWorker.url()).toContain('/sw.js')
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return Boolean(registration.active && navigator.serviceWorker.controller)
  })).toBe(true)
  const updateState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    await registration.update()
    return { active: registration.active?.state, scope: registration.scope, waiting: Boolean(registration.waiting) }
  })
  expect(updateState).toMatchObject({ active: 'activated', waiting: false })
  expect(updateState.scope).toBe(new URL('/', page.url()).toString())

  await expect.poll(() => page.evaluate(async () => {
    const names = await caches.keys()
    const requests = (await Promise.all(names.map(async (name) => (await caches.open(name)).keys()))).flat()
    return {
      entries: requests.length,
      hasDocument: requests.some((request) => ['/', '/index.html'].includes(new URL(request.url).pathname)),
      hasScript: requests.some((request) => new URL(request.url).pathname.endsWith('.js')),
      hasStyles: requests.some((request) => new URL(request.url).pathname.endsWith('.css')),
    }
  })).toMatchObject({ hasDocument: true, hasScript: true, hasStyles: true })
  await page.getByRole('button', { name: /В путь/ }).click()
  await page.getByRole('button', { name: /Пропустить/ }).last().click()
  await expect(page.getByRole('button', { name: /Железная клятва/ })).toBeVisible()

  await expect.poll(() => page.evaluate(async () => new Promise<number | null>((resolve, reject) => {
    const request = indexedDB.open('ashen-ring', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('game', 'readonly')
      const get = transaction.objectStore('game').get('current-v1')
      get.onerror = () => reject(get.error)
      get.onsuccess = () => resolve((get.result as { version?: number } | undefined)?.version ?? null)
    }
  }))).toBe(18)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: /Железная клятва/ })).toBeVisible()
  await page.getByRole('button', { name: /Железная клятва/ }).click()
  await page.getByRole('button', { name: /Начать поход/ }).click()
  await expect(page.getByRole('button', { name: /Засада/ }).first()).toBeVisible()

  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})
