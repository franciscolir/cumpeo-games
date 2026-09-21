import { test, expect } from '@playwright/test';
import { crearPartidaCancionIncompleta, irACOnductor } from './_helpers/cancion-incompleta.js';

test('timer se inicia y detiene', async ({ page, context }) => {
  const codigo = await crearPartidaCancionIncompleta(page, context);
  await irACOnductor(page, codigo);
  await page.getByRole('button', { name: /Iniciar juego/i }).click();
  await page.getByRole('button', { name: /Iniciar turno/i }).click();
  await expect(page.getByRole('button', { name: /Iniciar tiempo/i })).toBeVisible();
  await page.getByRole('button', { name: /Iniciar tiempo/i }).click();
  await expect(page.getByRole('button', { name: /Detener tiempo/i })).toBeVisible();
  // timer visible
  await expect(page.locator('#ci-timer')).toBeVisible();
});
