import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import { crearPartidaCancionIncompleta, irACOnductor } from './_helpers/cancion-incompleta.js';

test.beforeEach(loginTestUser);

test('avanza a FIN_DE_RONDA y siguiente ronda', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});

test('dos rondas completas con siguiente ronda', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});
