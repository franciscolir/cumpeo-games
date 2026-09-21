import { test, expect } from '@playwright/test';
import { crearPartidaCancionIncompleta, irACOnductor } from './_helpers/cancion-incompleta.js';

test('avanza a FIN_DE_RONDA y siguiente ronda', async ({ page, context }) => {
  const codigo = await crearPartidaCancionIncompleta(page, context);
  await irACOnductor(page, codigo);
  await page.getByRole('button', { name: /Iniciar juego/i }).click();
  await page.getByRole('button', { name: /Iniciar turno/i }).click();
  await page.getByRole('button', { name: /Iniciar tiempo/i }).click();
  await page.getByRole('button', { name: /Detener tiempo/i }).click();
  await page.getByRole('button', { name: /Correcto/i }).click();
  // Ahora estamos en canción 2 equipo 2
  await page.getByRole('button', { name: /Iniciar turno/i }).click();
  await page.getByRole('button', { name: /Iniciar tiempo/i }).click();
  await page.getByRole('button', { name: /Detener tiempo/i }).click();
  await page.getByRole('button', { name: /Incorrecto/i }).click();
  // Con 1 ronda, debería ir a FIN_DE_JUEGO
  await expect(page.getByText(/FIN_DE_JUEGO/i)).toBeVisible();
});
