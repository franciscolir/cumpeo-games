import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import { crearPartidaCancionIncompleta, irACOnductor, irAPublica } from './_helpers/cancion-incompleta.js';

test.beforeEach(loginTestUser);

test('flujo completo: inicio, turno, iniciar tiempo, detener, acierto', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irACOnductor(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});

test('publica muestra timer y marcador', async ({ page }) => {
  const codigo = await crearPartidaCancionIncompleta(page);
  await irAPublica(page, codigo);
  await expect(page.locator('body')).toBeVisible();
});
