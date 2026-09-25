import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  setupPartidaEnlaces,
  iniciarPartidaEnlaces,
  irACOnductor,
  iniciarJuegoYRonda,
  elegirSet,
  obtenerEstadoEnlaces,
  esperarFase
} from './_helpers/enlaces.js';

test.beforeEach(loginTestUser);

test('timer corre en ORDENANDO (cuenta regresiva visible)', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page, { tiempoTurno: 10 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('ORDENANDO');
  expect(estado.tiempo_agotado).toBe(false);

  // El timer del conductor debe mostrar segundos y decrecer
  await page.waitForFunction(() => document.querySelector('#enlaces-timer'), null, { timeout: 10000 });
  const t1 = await page.locator('#enlaces-timer').textContent();
  const n1 = parseInt(t1, 10);
  expect(Number.isFinite(n1)).toBe(true);

  await page.waitForTimeout(2200);

  const t2 = await page.locator('#enlaces-timer').textContent();
  const n2 = parseInt(t2, 10);
  expect(Number.isFinite(n2)).toBe(true);
  expect(n2).toBeLessThan(n1);
});

test('timer llega a 0 → ESPERA_VALIDACION con tiempo_agotado', async ({ page }) => {
  test.setTimeout(60000);
  // tiempo_turno_seg: 2 → time-up rápido
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page, { tiempoTurno: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  // Esperar transición automática a ESPERA_VALIDACION
  await esperarFase(page, partidaId, 'ESPERA_VALIDACION', 15000);

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.fase).toBe('ESPERA_VALIDACION');
  expect(estado.tiempo_agotado).toBe(true);
  expect(estado.tiempo_restante_seg).toBe(0);
  expect(estado.timer_activo).toBe(false);

  // En ESPERA_VALIDACION sigue habiendo botón Validar (sin Deshacer)
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="validar-enlaces"]'), null, { timeout: 10000 });
  const deshacerVisible = await page.locator('[data-accion-conductor="deshacer-enlaces"]').count();
  expect(deshacerVisible).toBe(0);
});

test('en ESPERA_VALIDACION no se puede mover (drag no responde)', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, setIdEq1 } = await setupPartidaEnlaces(page, { tiempoTurno: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);

  await esperarFase(page, partidaId, 'ESPERA_VALIDACION', 15000);

  const antes = await obtenerEstadoEnlaces(page, partidaId);
  const bAntes = [...antes.columna_b];

  // Intentar mover: el elemento tiene draggable=false, dragstart no se emite
  const source = page.locator('.enlaces-columna-b-item[data-idx="0"]');
  const target = page.locator('.enlaces-columna-b-item[data-idx="2"]');
  const draggable = await source.getAttribute('draggable');
  expect(draggable).toBe('false');

  await source.dispatchEvent('dragstart');
  await target.dispatchEvent('dragover');
  await target.dispatchEvent('drop');
  await source.dispatchEvent('dragend');
  await page.waitForTimeout(500);

  const despues = await obtenerEstadoEnlaces(page, partidaId);
  expect(despues.fase).toBe('ESPERA_VALIDACION');
  expect(despues.columna_b).toEqual(bAntes);
  expect(despues.movimientos).toHaveLength(0);
});
