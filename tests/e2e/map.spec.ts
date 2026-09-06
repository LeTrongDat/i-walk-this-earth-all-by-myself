import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`real map renders, navigates and reloads at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize(viewport)
    const tiles: string[] = []
    page.on('response', response => {
      if (response.ok() && /planet\/.*\.pbf|MapServer\/tile\//.test(response.url())) tiles.push(response.url())
    })
    await page.goto('')
    const map = page.locator('.world-map')
    await expect(map).toHaveAttribute('data-map-state', 'ready', { timeout: 30000 })
    await expect.poll(() => map.getAttribute('data-rendered-features').then(Number), { timeout: 30000 }).toBeGreaterThan(20)
    await expect.poll(() => map.getAttribute('data-rendered-routes').then(Number)).toBeGreaterThan(0)
    expect(tiles.some(url => url.includes('/planet/'))).toBeTruthy()
    expect(tiles.some(url => url.includes('/MapServer/tile/'))).toBeTruthy()
    const fields = await map.getAttribute('data-label-fields')
    expect(fields).toContain('name_en')
    expect(fields).not.toContain('["get","name"]')
    await page.screenshot({ path: `test-results/map-${viewport.width}.png` })
    const zoom = Number(await map.getAttribute('data-zoom'))
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await expect.poll(() => map.getAttribute('data-zoom').then(Number)).toBeGreaterThan(zoom + .5)
    await page.getByRole('button', { name: 'Street map', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Satellite', exact: true }).click()
    await page.reload()
    await expect.poll(() => map.getAttribute('data-rendered-features').then(Number), { timeout: 30000 }).toBeGreaterThan(20)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await page.locator('.atlas-trip').first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'A slow road through Vietnam' })).toBeVisible()
    await expect.poll(() => map.getAttribute('data-rendered-routes').then(Number), { timeout: 30000 }).toBeGreaterThan(0)
    await page.screenshot({ path: `test-results/trip-${viewport.width}.png` })
  })
}

test.describe('network failure injection', () => {
test.use({ serviceWorkers: 'block' }) // Intercept the map request, not a service-worker cache hit.
test('failed map is visible to users and retry recovers', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/styles/**', route => route.abort())
  await page.goto('')
  await expect(page.getByRole('alert')).toContainText('Map could not load', { timeout: 20000 })
  await page.unroute('https://tiles.openfreemap.org/styles/**')
  await page.getByRole('button', { name: 'Retry map' }).click()
  await expect.poll(() => page.locator('.world-map').getAttribute('data-rendered-features').then(Number), { timeout: 30000 }).toBeGreaterThan(20)
})
})
