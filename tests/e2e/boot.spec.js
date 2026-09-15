import { test, expect } from '@playwright/test';

test('la app arranca y muestra CUMPEO', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('CUMPEO')).toBeVisible();
  await expect(page.getByText('H0 + H1 · OK')).toBeVisible();
});

test('el tema se resuelve a light o dark', async ({ page }) => {
  await page.goto('/');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(['light', 'dark']).toContain(theme);
});
