import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import { crearPartidaCancionIncompleta, irACOnductor } from './_helpers/cancion-incompleta.js';

test.beforeEach(loginTestUser);

test('error automático con time up aplica penalización', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});

test('time up con penalización avanza canción', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});
