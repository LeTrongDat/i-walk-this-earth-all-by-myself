import { expect, test } from '@playwright/test'

test('loads the atlas and completes a trip planning and journal flow', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.route('https://nominatim.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ place_id: 42, display_name: 'Paris, Île-de-France, France', lat: '48.8566', lon: '2.3522', name: 'Paris', address: { country: 'France', city: 'Paris' } }])
    })
  })

  await page.goto('')
  await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
  await page.getByRole('link', { name: 'Trips', exact: true }).click()
  await page.getByRole('button', { name: 'New trip' }).click()
  await page.getByLabel('Trip name').fill('Paris in spring')
  await page.getByLabel('A short description').fill('A personal test journey.')
  await page.getByRole('button', { name: 'Create trip' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Paris in spring' })).toBeVisible()
  await page.getByRole('button', { name: /Add your first place/ }).click()
  await page.getByLabel('Search for a city or place').fill('Paris')
  await page.getByRole('button', { name: /^Paris/ }).click()
  await page.getByRole('button', { name: 'Add to route' }).click()
  await expect(page.getByRole('heading', { name: 'Paris', exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Add a memory' }).last().click()
  await page.getByLabel('Title').fill('An afternoon by the Seine')
  await page.getByLabel('Your story').fill('The light changed and the city became quiet for a minute.')
  await page.getByRole('button', { name: 'Add to journal' }).click()
  await expect(page.getByRole('heading', { name: 'An afternoon by the Seine' })).toBeVisible()
  expect(browserErrors).toEqual([])
})

test('renders the responsive mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
})
