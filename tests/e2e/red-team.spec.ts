import { expect, test, type Page } from '@playwright/test'

// Isolated browser contexts only; never touches the user's browser atlas.
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('keyval-store')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        const request = db.transaction('keyval').objectStore('keyval').get('i-walk-this-earth-data-v1')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally { db.close() }
  })
}

async function createTrip(page: Page, title: string) {
  await page.goto('./#/trips')
  await page.getByRole('button', { name: 'New trip' }).click()
  await page.getByLabel('Trip name').fill(title)
  await page.getByRole('button', { name: 'Create trip', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect.poll(() => stored(page)).toContain(title)
}

test('red team: trip create edit delete survives fresh page loads', async ({ page }) => {
  await createTrip(page, 'RT CRUD original')
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: 'Edit trip', exact: true }).click()
  await page.getByLabel('Trip name').fill('RT CRUD edited')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(() => stored(page)).toContain('RT CRUD edited')
  await page.goto('./#/trips')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'RT CRUD edited' })).toBeVisible()
  await page.getByRole('heading', { name: 'RT CRUD edited' }).click()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: 'Delete trip', exact: true }).click()
  await expect.poll(() => stored(page)).not.toContain('RT CRUD edited')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your journeys' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'RT CRUD edited' })).toHaveCount(0)
})

test('red team: reload preserves a persisted custom trip deep link', async ({ page }) => {
  await createTrip(page, 'RT reload destination')
  const url = page.url()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'RT reload destination' })).toBeVisible({ timeout: 5000 })
  await expect(page).toHaveURL(url)
})

test('red team: failed IndexedDB commit must not present a saved trip', async ({ page }) => {
  await createTrip(page, 'RT durable baseline')
  await page.getByRole('link', { name: 'Trips', exact: true }).first().click()
  await page.getByRole('button', { name: 'New trip' }).click()
  await page.getByLabel('Trip name').fill('RT lost after commit failure')
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      const request = put.apply(this, args)
      this.transaction.abort()
      return request
    }
  })
  await page.getByRole('button', { name: 'Create trip', exact: true }).click()
  // Let the React submit update paint before recording whether success was shown.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const presentedAsSaved = await page.getByRole('heading', { level: 1, name: 'RT lost after commit failure' }).isVisible()
  await page.goto('./#/trips')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'RT durable baseline' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'RT lost after commit failure' })).toHaveCount(0)
  expect(presentedAsSaved, 'Form closed and opened trip detail although commit aborted and reload lost it').toBe(false)
})

test('red team: malformed backup must not replace durable atlas', async ({ page }) => {
  await createTrip(page, 'RT preserve on bad import')
  await page.goto('./#/profile')
  await expect(page.getByRole('button', { name: 'Import backup' })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken-backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ trips: [{}], memories: [], profile: {} }))
  })
  await expect.poll(() => stored(page), { timeout: 3000 }).toContain('RT preserve on bad import')
  expect(errors).toEqual([])
})

test('red team: reversed dates and whitespace trip names are rejected', async ({ page }) => {
  await page.goto('./#/trips')
  await page.getByRole('button', { name: 'New trip' }).click()
  await page.getByLabel('Trip name').fill('RT invalid dates')
  await page.getByLabel('Starts', { exact: true }).fill('2026-09-10')
  await page.getByLabel('Ends', { exact: true }).fill('2026-09-01')
  await page.getByRole('button', { name: 'Create trip', exact: true }).click()
  await expect(page.getByLabel('Trip name')).toBeVisible()
  await page.getByLabel('Ends', { exact: true }).fill('2026-09-11')
  await page.getByLabel('Trip name').fill('   ')
  await page.getByRole('button', { name: 'Create trip', exact: true }).click()
  await expect(page.getByLabel('Trip name')).toBeVisible({ timeout: 3000 })
})

test('red team: saving in a stale second tab must preserve first tab trips', async ({ page, context }) => {
  await createTrip(page, 'RT shared baseline')
  const second = await context.newPage()
  await second.goto('./#/profile')
  await expect(second.getByRole('button', { name: 'Edit profile' })).toBeVisible()
  await expect.poll(() => stored(second)).toContain('RT shared baseline')
  await createTrip(page, 'RT first tab new trip')
  await second.getByRole('button', { name: 'Edit profile' }).click()
  await second.getByLabel('Your name').fill('RT second tab traveller')
  await second.getByRole('button', { name: 'Save profile' }).click()
  await expect.poll(() => stored(second)).toContain('RT second tab traveller')
  expect(await stored(second), 'A profile save in tab B overwrote the new trip from tab A').toContain('RT first tab new trip')
})

test('red team: place and memory persist and trip deletion cascades', async ({ page }) => {
  await page.route('https://nominatim.openstreetmap.org/**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([{ place_id: 42, display_name: 'Paris, France', lat: '48.8566', lon: '2.3522', name: 'Paris', address: { country: 'France' } }])
  }))
  await createTrip(page, 'RT journal cascade')
  await page.getByRole('button', { name: 'Add a step', exact: true }).click()
  await page.getByLabel('Search for a city or place').fill('Paris')
  await page.getByRole('button', { name: /^Paris/ }).click()
  await page.getByRole('button', { name: 'Add to route' }).click()
  await page.getByRole('tab', { name: /^Journal/ }).click()
  await page.getByRole('button', { name: 'Add a memory', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('RT persistent journal')
  await page.getByLabel('Your story').fill('RT persistent story')
  await page.getByRole('button', { name: 'Add to journal' }).click()
  await expect.poll(() => stored(page)).toContain('RT persistent journal')
  await page.goto('./#/trips')
  await page.reload()
  await page.getByRole('heading', { name: 'RT journal cascade' }).click()
  await expect(page.getByRole('heading', { name: 'RT persistent journal' })).toBeVisible()
  await page.getByRole('tab', { name: /^Plan/ }).click()
  await expect(page.getByRole('heading', { name: 'Paris', exact: true })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'More actions' }).click()
  await page.getByRole('button', { name: 'Delete trip', exact: true }).click()
  await expect.poll(() => stored(page)).not.toContain('RT persistent journal')
})

test('red team: updated map loads real features and both layers without page errors', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('')
  const map = page.locator('.world-map')
  await expect(map).toHaveAttribute('data-map-state', 'ready', { timeout: 20000 })
  await expect.poll(async () => Number(await map.getAttribute('data-rendered-features'))).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Street map', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Satellite', exact: true }).click()
  await expect(map).toHaveAttribute('data-map-state', 'ready')
  await page.screenshot({ path: testInfo.outputPath('desktop-map.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('red team: updated mobile atlas allows stats and trip creation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  await expect(page.locator('.world-map')).toHaveAttribute('data-map-state', 'ready', { timeout: 20000 })
  await expect(page.locator('.map-marker').first()).toBeInViewport()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await page.getByRole('tab', { name: 'Stats', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your travels in numbers' })).toBeVisible()
  await page.getByRole('tab', { name: 'Trips', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('mobile-atlas.png'), fullPage: true })
  await page.getByRole('button', { name: 'Add a trip', exact: true }).click()
  await page.getByLabel('Trip name').fill('RT mobile journey')
  await page.getByRole('button', { name: 'Create trip', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'RT mobile journey' })).toBeVisible()
  await expect.poll(() => stored(page)).toContain('RT mobile journey')
})

test('red team: mobile trip carousel opens plan and journal remains accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/trips/trip_vietnam')
  await expect(page.getByRole('heading', { level: 1, name: 'A slow road through Vietnam' })).toBeVisible()
  await page.getByRole('button', { name: /STEP 1 Hanoi/ }).click()
  await expect(page.getByRole('tab', { name: /^Plan/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Itinerary', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: /^Journal/ }).click()
  await expect(page.getByRole('heading', { name: 'The city wakes before us', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add a step', exact: true }).click()
  await expect(page.getByLabel('Search for a city or place')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
