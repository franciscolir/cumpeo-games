/* =============================================================
   Pictionary Bonus — test e2e de bonus manual.
   
   Cubre: aplicar bonus a Eq1 y Eq2 con input inline.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  crearPartidaPictionary,
  iniciarPartidaPictionary,
  obtenerContextoPictionary,
  irAConductor,
  esperarBotonPictionary
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

test('aplicar bonus a Eq1 suma 5 puntos', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.puntos_equipo_1).toBe(0);

  await page.fill('#pic-bonus-input-eq1', '5');
  await page.click('#btn-pic-bonus-eq1');
  await page.waitForTimeout(300);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_1).toBe(5);
});

test('aplicar bonus a Eq2 suma 5 puntos', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.puntos_equipo_2).toBe(0);

  await page.fill('#pic-bonus-input-eq2', '5');
  await page.click('#btn-pic-bonus-eq2');
  await page.waitForTimeout(300);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_2).toBe(5);
});
