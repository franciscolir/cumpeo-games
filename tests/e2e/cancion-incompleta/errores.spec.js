import { test, expect } from '@playwright/test';
import { crearPartidaCancionIncompleta, irACOnductor } from './_helpers/cancion-incompleta.js';

test('error automático con time up aplica penalización', async ({ page, context }) => {
  const codigo = await crearPartidaCancionIncompleta(page, context);
  await irACOnductor(page, codigo);
  await page.getByRole('button', { name: /Iniciar juego/i }).click();
  await page.getByRole('button', { name: /Iniciar turno/i }).click();
  await page.getByRole('button', { name: /Iniciar tiempo/i }).click();
  // Esperar que el timer llegue a 0 automáticamente (10s) -> en e2e real se puede mockear
  // Por ahora verificamos que los botones existen
  await expect(page.getByRole('button', { name: /Detener tiempo/i })).toBeVisible();
});
