import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  setupPartidaEnlaces,
  iniciarPartidaEnlaces,
  irACOnductor,
  iniciarJuegoYRonda,
  elegirSet,
  obtenerEstadoEnlaces,
  esperarFase,
  validarTurno,
  iniciarSiguienteTurno
} from './_helpers/enlaces.js';

test.beforeEach(loginTestUser);

test('set con menos de pares_por_turno items → set inválido', async ({ page }) => {
  await waitForCumpeo(page);

  const shortSetId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const enlaces = juegos.find((j) => j.codigo === 'ENLACES');
    if (!enlaces) throw new Error('Juego ENLACES no encontrado');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: enlaces.id,
      nombre: `Enlaces Short Set ${uid}`
    });

    for (let i = 0; i < 3; i++) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        concepto_a: `A${i + 1}`,
        concepto_b: `B${i + 1}`,
        categoria: 'E2E'
      });
    }

    return set.id;
  });

  const validacion = await page.evaluate(async (setId) => {
    const itemsRaw = await window.cumpeo.services.set.listarItemsDeSet(setId);
    const items = itemsRaw.map((it) => ({ ...it.contenido, id: it.id }));

    const { EnlacesGameDefinition } = await import('/src/games/enlaces/EnlacesGameDefinition.js');
    const config = {
      rondas: 1,
      pares_por_turno: 8,
      tiempo_turno_seg: 60,
      puntos_por_acierto: 10
    };
    try {
      EnlacesGameDefinition.validarContenidoSet({ items }, config);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, shortSetId);

  expect(validacion.ok).toBe(false);
  expect(validacion.error).toContain('al menos 8 items');
});

test('item sin concepto_b → set inválido', async ({ page }) => {
  await waitForCumpeo(page);

  const validacion = await page.evaluate(async () => {
    const { EnlacesGameDefinition } = await import('/src/games/enlaces/EnlacesGameDefinition.js');
    const config = {
      rondas: 1,
      pares_por_turno: 2,
      tiempo_turno_seg: 60,
      puntos_por_acierto: 10
    };
    const contenido = {
      items: [
        { concepto_a: 'A1', concepto_b: 'B1' },
        { concepto_a: 'A2', concepto_b: '' }
      ]
    };
    try {
      EnlacesGameDefinition.validarContenidoSet(contenido, config);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  expect(validacion.ok).toBe(false);
  expect(validacion.error).toContain('concepto_b');
});

test('múltiples rondas: FIN_DE_RONDA → siguiente ronda → INICIO_RONDA ronda 2', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, setIdEq1, setIdEq2 } = await setupPartidaEnlaces(page, { rondas: 2 });

  await irACOnductor(page, partidaId);
  await iniciarPartidaEnlaces(page, partidaId);

  // Ronda 1 — Eq1
  await iniciarJuegoYRonda(page);
  await elegirSet(page, setIdEq1);
  await validarTurno(page);
  await page.click('#btn-enlaces-siguiente-turno');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'SELECCIONANDO_SET');

  // Ronda 1 — Eq2
  await elegirSet(page, setIdEq2);
  await validarTurno(page);
  await page.click('#btn-enlaces-siguiente-turno');
  await esperarFase(page, partidaId, 'CAMBIO_TURNO');
  await iniciarSiguienteTurno(page, partidaId);
  await esperarFase(page, partidaId, 'FIN_DE_RONDA');

  // FIN_DE_RONDA ronda 1 → siguiente ronda
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-siguiente-ronda'), null, { timeout: 15000 });
  await page.click('#btn-enlaces-siguiente-ronda');
  await page.waitForTimeout(400);
  await page.waitForFunction(() => document.querySelector('#btn-enlaces-iniciar-ronda'), null, { timeout: 10000 });

  const estado = await obtenerEstadoEnlaces(page, partidaId);
  expect(estado.ronda_actual).toBe(2);
  expect(estado.fase).toBe('INICIO_RONDA');
});
