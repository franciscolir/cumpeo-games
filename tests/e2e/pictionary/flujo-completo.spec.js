/* =============================================================
   Pictionary Flujo Completo — test e2e del flujo feliz.

   Cubre: crear set → partida → iniciar → elegir submodo →
   set → tiempo → acierto → cambios de turno → fin de ronda.
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

test('crear set + partida + iniciar muestra panel para elegir submodo', async ({ page }) => {
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');

  await esperarBotonPictionary(page, '#btn-pic-submodo-PALABRAS');
  const panel = page.locator('#shell-panel-conductor');
  await expect(panel.getByText('Elegí el submodo de representación')).toBeVisible();
  await expect(panel.locator('#btn-pic-submodo-GESTOS')).toBeVisible();
  await expect(panel.locator('#btn-pic-submodo-DIBUJO')).toBeVisible();
});

test('jugar 1 turno (PALABRAS) suma 10 a Eq1 y deja al Eq2 en el mismo submodo', async ({ page }) => {
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-submodo-PALABRAS');

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.fase).toBe('SELECCIONANDO_SUBMODO');
  expect(ctx1.estadoJuego.submodo_actual).toBe('PALABRAS');
  expect(ctx1.estadoJuego.equipo_actual).toBe(1);

  await jugarTurnoUI(page);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_1).toBe(10);
  expect(ctx2.estadoJuego.equipo_actual).toBe(2);
  expect(ctx2.estadoJuego.submodo_actual).toBe('PALABRAS');
  expect(ctx2.estadoJuego.fase).toBe('SELECCIONANDO_SUBMODO');
  expect(ctx2.estadoJuego.turnos_completados_equipo_1).toBe(1);
});

test('jugar los 8 turnos de ronda 1 (4 submodos × 2 equipos) llega a FIN_DE_RONDA con rondas=2', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId } = await crearPartidaPictionary(page, { rondas: 2 });
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-submodo-PALABRAS');

  await avanzarTurnosProgramatico(page, partidaId, 8);

  const ctx = await obtenerContextoPictionary(page, partidaId);
  expect(ctx.estadoJuego.fase).toBe('FIN_DE_RONDA');
  expect(ctx.estadoJuego.turnos_completados_equipo_1).toBe(4);
  expect(ctx.estadoJuego.turnos_completados_equipo_2).toBe(4);
  expect(ctx.estadoJuego.submodo_actual).toBe('PALABRAS');
  expect(ctx.estadoJuego.equipo_actual).toBe(1);

  await expect(page.locator('#shell-panel-conductor').locator('#btn-pic-siguiente-ronda')).toBeVisible();
});
