import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaMemoria,
  iniciarPartidaMemoria,
  irACOnductor,
  obtenerEstadoMemoria,
  encontrarNoParejaEnEstado
} from './_helpers/memoria.js';

test.beforeEach(loginTestUser);

test('después de un fallo, Eq2 toma el turno', async ({ page }) => {
  test.setTimeout(30000);
  const { partidaId } = await setupPartidaMemoria(page, { tiempoModal: 1 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-memoria"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-memoria"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-memoria"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-memoria"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-set-memoria"]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="confirmar-grilla-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="confirmar-grilla-memoria"]');
  await page.waitForTimeout(500);

  // Eq1 falla una pareja
  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estado.equipo_actual).toBe(1);
  const [i1, i2] = encontrarNoParejaEnEstado(estado);

  await page.locator(`[data-elemento-index="${i1}"]`).click();
  await page.waitForTimeout(300);
  await page.locator(`[data-elemento-index="${i2}"]`).click();
  await page.waitForTimeout(500);

  // Esperar que el modal pase y Eq2 tome el turno
  await page.waitForTimeout(1500);

  const estadoFinal = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinal.equipo_actual).toBe(2);
  expect(estadoFinal.fase).toBe('JUGANDO');
  expect(estadoFinal.puntos_equipo_1).toBe(0);
  expect(estadoFinal.puntos_equipo_2).toBe(0);
});

test('selector manual cambia el equipo', async ({ page }) => {
  test.setTimeout(30000);
  const { partidaId } = await setupPartidaMemoria(page);

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-memoria"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-memoria"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-memoria"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-memoria"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-set-memoria"]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="confirmar-grilla-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="confirmar-grilla-memoria"]');
  await page.waitForTimeout(500);

  // Verificar Eq1 activo
  const estado = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estado.equipo_actual).toBe(1);

  // Selector de cambio manual (descriptor selector — 8.5c.1)
  await page.waitForFunction(() => {
    return document.querySelector('[data-accion-conductor="cambiar-turno-manual-memoria"]');
  }, { timeout: 10000 });

  await page.selectOption('[data-accion-conductor="cambiar-turno-manual-memoria"]', '2');
  await page.waitForTimeout(500);

  // Verificar que ahora es CAMBIO_TURNO (manual)
  const estadoCambio = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoCambio.fase).toBe('CAMBIO_TURNO');
  expect(estadoCambio.equipo_actual).toBe(2);
});
