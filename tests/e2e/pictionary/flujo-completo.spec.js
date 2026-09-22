/* =============================================================
   Pictionary Flujo Completo — test e2e del flujo feliz.
   
   Cubre: crear set → partida → iniciar → jugar turnos → fin de ronda.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  crearPartidaPictionary,
  iniciarPartidaPictionary,
  obtenerContextoPictionary,
  irAConductor,
  esperarBotonPictionary,
  jugarTurnoUI,
  avanzarTurnosProgramatico
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

test('crear set + partida + iniciar muestra panel con Iniciar modo', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');
  const panel = page.locator('#shell-panel-conductor');
  await expect(panel.getByText('Iniciar modo')).toBeVisible();
});

test('jugar un modo completo suma 10 puntos y avanza a modo 2', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.fase).toBe('INICIO_RONDA');
  expect(ctx1.estadoJuego.modo_actual).toBe(1);
  expect(ctx1.estadoJuego.equipo_actual).toBe(1);

  await jugarTurnoUI(page);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_1).toBe(10);
  expect(ctx2.estadoJuego.modo_actual).toBe(2);
  expect(ctx2.estadoJuego.equipo_actual).toBe(1);
});

test('jugar los 4 modos de ambos equipos en ronda 1 llega a FIN_DE_RONDA con rondas=2', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, codigo } = await crearPartidaPictionary(page, { rondas: 2 });
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await avanzarTurnosProgramatico(page, partidaId, 8);

  const ctx = await obtenerContextoPictionary(page, partidaId);
  expect(ctx.estadoJuego.fase).toBe('FIN_DE_RONDA');

  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-pic-siguiente-ronda');
  }, { timeout: 10000 });
});
