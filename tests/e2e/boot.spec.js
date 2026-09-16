import { test, expect } from '@playwright/test';

test('la app arranca y muestra el título CUMPEO', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.font-display-hero').first()).toContainText('CUMPEO');
  await expect(page.getByText('H2 · OK')).toBeVisible();
});

test('el tema se resuelve a light o dark', async ({ page }) => {
  await page.goto('/');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(theme);
});
