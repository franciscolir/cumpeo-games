import { test, expect } from '@playwright/test';
import { loginTestUser } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

test('con VITE_SUPABASE_ADAPTER=false usa LocalAdapter', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Panel del conductor')).toBeVisible();
});
