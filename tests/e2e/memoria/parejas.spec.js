import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaMemoria,
  iniciarPartidaMemoria,
  irACOnductor,
  obtenerEstadoMemoria,
  encontrarParejaEnEstado,
  encontrarNoParejaEnEstado
} from './_helpers/memoria.js';

test.beforeEach(loginTestUser);

test('encontrar pareja → suma puntos', async ({ page }) => {
  test.setTimeout(30000);
  const { partidaId } = await setupPartidaMemoria(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-memoria-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-memoria-iniciar-ronda');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.locator('[data-set-id]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-confirmar-grilla'), { timeout: 10000 });
  await page.click('#btn-memoria-confirmar-grilla');
  await page.waitForTimeout(500);

  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  const [i1, i2] = encontrarParejaEnEstado(estado);

  await page.locator(`[data-elemento-index="${i1}"]`).click();
  await page.waitForTimeout(300);
  await page.locator(`[data-elemento-index="${i2}"]`).click();
  await page.waitForTimeout(500);

  const estadoFinal = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinal.puntos_equipo_1).toBe(10);
  expect(estadoFinal.elementos_descubiertos).toContain(i1);
  expect(estadoFinal.elementos_descubiertos).toContain(i2);
});

test('fallar pareja → CAMBIO_TURNO', async ({ page }) => {
  test.setTimeout(30000);
  const { partidaId } = await setupPartidaMemoria(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-memoria-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-memoria-iniciar-ronda');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.locator('[data-set-id]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-confirmar-grilla'), { timeout: 10000 });
  await page.click('#btn-memoria-confirmar-grilla');
  await page.waitForTimeout(500);

  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  const [i1, i2] = encontrarNoParejaEnEstado(estado);

  await page.locator(`[data-elemento-index="${i1}"]`).click();
  await page.waitForTimeout(300);
  await page.locator(`[data-elemento-index="${i2}"]`).click();
  await page.waitForTimeout(500);

  const estadoFinal = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinal.fase).toBe('CAMBIO_TURNO');
  expect(estadoFinal.elementos_volteados).toContain(i1);
  expect(estadoFinal.elementos_volteados).toContain(i2);
});

test('modal CAMBIO_TURNO dura 1s → JUGANDO con otro equipo', async ({ page }) => {
  test.setTimeout(30000);
  const { partidaId } = await setupPartidaMemoria(page, { tiempoModal: 1 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-memoria-iniciar-juego');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-memoria-iniciar-ronda');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-set-id]'), { timeout: 10000 });
  await page.locator('[data-set-id]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#btn-memoria-confirmar-grilla'), { timeout: 10000 });
  await page.click('#btn-memoria-confirmar-grilla');
  await page.waitForTimeout(500);

  // Fallar una pareja
  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estado.equipo_actual).toBe(1);
  const [i1, i2] = encontrarNoParejaEnEstado(estado);

  await page.locator(`[data-elemento-index="${i1}"]`).click();
  await page.waitForTimeout(300);
  await page.locator(`[data-elemento-index="${i2}"]`).click();
  await page.waitForTimeout(500);

  // Verificar CAMBIO_TURNO
  const estadoCambio = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoCambio.fase).toBe('CAMBIO_TURNO');

  // Esperar 1.5s para que el modal se cierre y vuelva a JUGANDO
  await page.waitForTimeout(1500);

  // Verificar que volvió a JUGANDO con otro equipo
  const estadoFinal = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinal.fase).toBe('JUGANDO');
  expect(estadoFinal.equipo_actual).toBe(2);
  expect(estadoFinal.elementos_volteados).toEqual([]);
});
