import { test, expect } from '@playwright/test';

test('la app abre IndexedDB en el navegador', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('H2 · OK')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('17 stores')).toBeVisible();

  const existe = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('cumpeo');
      req.onsuccess = () => {
        const db = req.result;
        const n = db.objectStoreNames.length;
        db.close();
        resolve(n);
      };
      req.onerror = () => resolve(-1);
    });
  });
  expect(existe).toBe(17);
});
