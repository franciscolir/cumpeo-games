import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaMemoria,
  iniciarPartidaMemoria,
  irACOnductor,
  obtenerEstadoMemoria,
  encontrarParejaEnEstado
} from './_helpers/memoria.js';

test.beforeEach(loginTestUser);

test('crear partida + iniciar juego + comenzar ronda + elegir set → PREPARANDO_GRILLA', async ({ page }) => {
  const { partidaId } = await setupPartidaMemoria(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  // INICIO_RONDA → btn iniciar juego
  await page.waitForFunction(() => {
    return document.querySelector('#btn-memoria-iniciar-juego');
  }, { timeout: 20000 });

  await page.click('#btn-memoria-iniciar-juego');
  await page.waitForTimeout(300);

  // SELECCIONANDO_SET → btn iniciar ronda
  await page.waitForFunction(() => {
    return document.querySelector('#btn-memoria-iniciar-ronda');
  }, { timeout: 10000 });

  await page.click('#btn-memoria-iniciar-ronda');
  await page.waitForTimeout(300);

  // Seleccionar el primer set disponible
  await page.waitForFunction(() => {
    return document.querySelector('[data-set-id]');
  }, { timeout: 10000 });

  await page.locator('[data-set-id]').first().click();
  await page.waitForTimeout(300);

  // Verificar PREPARANDO_GRILLA
  await page.waitForFunction(() => {
    return document.querySelector('#btn-memoria-confirmar-grilla');
  }, { timeout: 10000 });

  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estado.fase).toBe('PREPARANDO_GRILLA');
});

test('iniciar turno → JUGANDO con 12 elementos', async ({ page }) => {
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

  // Confirmar grilla → JUGANDO
  await page.waitForFunction(() => document.querySelector('#btn-memoria-confirmar-grilla'), { timeout: 10000 });
  await page.click('#btn-memoria-confirmar-grilla');
  await page.waitForTimeout(500);

  // Verificar JUGANDO
  await page.waitForFunction(() => {
    return document.querySelector('[data-elemento-index]');
  }, { timeout: 10000 });

  const elementos = await page.locator('[data-elemento-index]').count();
  expect(elementos).toBe(12);

  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estado.fase).toBe('JUGANDO');
});

test('encontrar pareja → suma +10 puntos Eq1', async ({ page }) => {
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

  // Obtener estado y encontrar pareja
  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  const [i1, i2] = encontrarParejaEnEstado(estado);

  // Voltear los 2 elementos de la pareja
  await page.locator(`[data-elemento-index="${i1}"]`).click();
  await page.waitForTimeout(300);
  await page.locator(`[data-elemento-index="${i2}"]`).click();
  await page.waitForTimeout(500);

  // Verificar puntos
  const estadoFinal = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinal.puntos_equipo_1).toBe(10);
  expect(estadoFinal.parejas_equipo_1).toBe(1);
  expect(estadoFinal.fase).toBe('JUGANDO');
});
