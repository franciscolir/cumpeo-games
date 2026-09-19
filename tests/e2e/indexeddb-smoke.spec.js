import { test, expect } from '@playwright/test';
import { loginTestUser } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

test('IndexedDB no se usa en modo Supabase', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Panel del conductor')).toBeVisible({ timeout: 10_000 });

  const storeCount = await page.evaluate(async () => {
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
  expect(storeCount).toBe(0);
});
