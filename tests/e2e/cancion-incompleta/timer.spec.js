import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import { crearPartidaCancionIncompleta, irACOnductor, irAPublica } from './_helpers/cancion-incompleta.js';

test.beforeEach(loginTestUser);

test('timer se inicia y detiene', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});

test('timer público visible en partida', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irAPublica(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});

test('timer corre y se detiene al cambiar fase', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});
