import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  crearSetMemoria,
  setupPartidaMemoria,
  iniciarPartidaMemoria,
  irACOnductor,
  obtenerEstadoMemoria
} from './_helpers/memoria.js';

test.beforeEach(loginTestUser);

test('set con menos de items que parejas_por_ronda → set inválido', async ({ page }) => {
  const { setId, juegoId } = await crearSetMemoria(page, { numParejas: 3 });

  await waitForCumpeo(page);
  const validacion = await page.evaluate(async ({ setId, juegoId }) => {
    const itemsRaw = await window.cumpeo.services.set.listarItemsDeSet(setId);
    const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));
    const { MemoriaGameDefinition } = await import('/src/games/memoria/MemoriaGameDefinition.js');
    const config = {
      rondas: 1,
      parejas_por_ronda: 6,
      tiempo_turno_seg: 20,
      tiempo_modal_cambio_turno_seg: 1,
      puntos_por_pareja: 10
    };
    try {
      MemoriaGameDefinition.validarContenidoSet({ items }, config);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, { setId, juegoId });

  expect(validacion.ok).toBe(false);
  expect(validacion.error).toContain('al menos 6 items');
});

test('múltiples rondas: FIN_DE_RONDA → siguiente ronda', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId } = await setupPartidaMemoria(page, { rondas: 2, numParejas: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaMemoria(page, partidaId);

  // INICIO_RONDA
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-memoria"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-memoria"]');
  await page.waitForTimeout(300);

  // SELECCIONANDO_SET
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-memoria"]');
  await page.waitForTimeout(300);

  // Elegir set (2 parejas = 4 elementos)
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-set-memoria"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-set-memoria"]').first().click();
  await page.waitForTimeout(300);

  // PREPARANDO_GRILLA → JUGANDO
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="confirmar-grilla-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="confirmar-grilla-memoria"]');
  await page.waitForTimeout(500);

  // Descubrir las 2 parejas (4 elementos) para llegar a FIN_DE_RONDA
  // Par 1
  await page.locator('[data-elemento-index="0"]').click();
  await page.waitForTimeout(300);

  const estado1 = await obtenerEstadoMemoria(page, String(partidaId));
  const el0 = estado1.elementos[0];
  const idxPareja0 = estado1.elementos.findIndex(
    (e, i) => i !== 0 && e.id_pareja === el0.id_pareja
  );
  await page.locator(`[data-elemento-index="${idxPareja0}"]`).click();
  await page.waitForTimeout(500);

  // Par 2
  const estado2 = await obtenerEstadoMemoria(page, String(partidaId));
  const idxNoDesc1 = estado2.elementos.findIndex((_, i) => !estado2.elementos_descubiertos.includes(i));
  await page.locator(`[data-elemento-index="${idxNoDesc1}"]`).click();
  await page.waitForTimeout(300);

  const estado3 = await obtenerEstadoMemoria(page, String(partidaId));
  const elNoDesc1 = estado3.elementos[idxNoDesc1];
  const idxPareja2 = estado3.elementos.findIndex(
    (e, i) => i !== idxNoDesc1 && e.id_pareja === elNoDesc1.id_pareja
  );
  await page.locator(`[data-elemento-index="${idxPareja2}"]`).click();
  await page.waitForTimeout(500);

  // Verificar FIN_DE_RONDA
  const estadoFinRonda = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoFinRonda.fase).toBe('FIN_DE_RONDA');

  // Verificar botón siguiente ronda
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-memoria"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-siguiente-ronda-memoria"]');
  await page.waitForTimeout(500);

  // Verificar INICIO_RONDA de ronda 2
  const estadoRonda2 = await obtenerEstadoMemoria(page, String(partidaId));
  expect(estadoRonda2.fase).toBe('INICIO_RONDA');
  expect(estadoRonda2.ronda_actual).toBe(2);
});
