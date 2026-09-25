/* =============================================================
   E2E — Panel conductor con contrato `accionesConductor` (8.5a)

   Verifica que el shell renderiza el panel de Trivia desde
   `accionesConductor` (descriptores + data-accion-conductor)
   y que las acciones bindean al onAccion del shell.

   Nota: Trivia conserva `renderizarPanelConductor` legacy
   (convivencia D8) — el shell lo ignora cuando hay
   `accionesConductor` con array no vacío.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupPartidaTriviaEnCurso(page) {
  await waitForCumpeo(page);
  const { id } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    const TRIVIA_CONFIG = {
      rondas: 1,
      preguntas_por_turno: 5,
      tiempo_por_pregunta_seg: 30,
      puntos_por_acierto: 10,
      penalizacion_por_error: 0,
      penalizacion_por_pasar: 0
    };

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `PanelCond ${uid}`,
      juegos: [{ juego_id: trivia.id, configuracion: TRIVIA_CONFIG }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `PanelCond ${uid}`,
        juegos: [{ juego_id: trivia.id, configuracion: TRIVIA_CONFIG }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PC${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id };
  });

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.locator('#btn-pausar')).toBeVisible({ timeout: 15000 });

  // iniciarJuego deja estado_juego vacío (fase '') → el shell muestra el
  // panel legacy "Iniciar juego". La acción iniciar-juego-trivia aplica
  // estadoInicial (fase INICIO_RONDA) y el panel pasa a accionesConductor.
  await page.evaluate(async () => {
    await window.__shellPartidaCallbacks.onAccion('iniciar-juego-trivia');
  });
  await waitForCumpeo(page);

  return id;
}

/**
 * Cambia la fase del juego activo usando la vía del propio shell
 * (`cambiar-estado-juego` vía onAccion → re-render automático).
 */
async function setFase(page, id, fase) {
  await page.evaluate(async (params) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(params.pid);
    const estado = { ...(ctx.juegos[0]?.estado_juego || {}), fase: params.fase };
    await window.__shellPartidaCallbacks.onAccion('cambiar-estado-juego', {
      estadoJuego: estado
    });
  }, { pid: id, fase });
}

test('fase INICIO_RONDA: panel muestra 1 botón con data-accion-conductor="iniciar-ronda-trivia"', async ({ page }) => {
  await page.goto('/');
  const id = await setupPartidaTriviaEnCurso(page);

  const btn = page.locator('#shell-panel-conductor [data-accion-conductor="iniciar-ronda-trivia"]');
  await expect(btn).toBeVisible({ timeout: 15000 });
  await expect(btn).toHaveText('Comenzar ronda');
  await expect(page.locator('#shell-panel-conductor [data-accion-conductor]')).toHaveCount(1);
});

test('click en Comenzar ronda dispara onAccion("iniciar-ronda-trivia") y avanza de fase', async ({ page }) => {
  await page.goto('/');
  const id = await setupPartidaTriviaEnCurso(page);

  const btn = page.locator('#shell-panel-conductor [data-accion-conductor="iniciar-ronda-trivia"]');
  await expect(btn).toBeVisible({ timeout: 15000 });

  await page.evaluate(() => {
    window.__accionesSpy = [];
    const cb = window.__shellPartidaCallbacks;
    const original = cb.onAccion;
    cb.onAccion = (tipo, payload = {}) => {
      window.__accionesSpy.push({ tipo, payload });
      return original(tipo, payload);
    };
  });

  await btn.click();

  await expect
    .poll(() => page.evaluate(() => window.__accionesSpy.map((a) => a.tipo)), { timeout: 10000 })
    .toContain('iniciar-ronda-trivia');

  await expect
    .poll(async () => {
      const ctx = await page.evaluate(async (pid) => {
        const c = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
        return c.juegos[0]?.estado_juego?.fase;
      }, id);
      return ctx;
    }, { timeout: 10000 })
    .toBe('SELECCIONANDO_SET');
});

test('fase SELECCIONANDO_SET con sets: muestra N botones (uno por set)', async ({ page }) => {
  await page.goto('/');
  const id = await setupPartidaTriviaEnCurso(page);

  const setsEsperados = await page.evaluate(async (pid) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');
    const uid = Date.now().toString(36);

    await window.cumpeo.services.set.crearSet({ juego_id: trivia.id, nombre: `PanelCond Set A ${uid}` });
    await window.cumpeo.services.set.crearSet({ juego_id: trivia.id, nombre: `PanelCond Set B ${uid}` });

    const sets = await window.cumpeo.services.set.listarSetsActivosPorJuego(trivia.id);
    return sets.length;
  }, id);

  expect(setsEsperados).toBeGreaterThanOrEqual(2);

  await setFase(page, id, 'SELECCIONANDO_SET');

  const botones = page.locator('#shell-panel-conductor [data-accion-conductor="seleccionar-set-trivia"]');
  await expect(botones).toHaveCount(setsEsperados, { timeout: 15000 });
  await expect(page.locator('#shell-panel-conductor').getByText(/Elegí un set para/)).toBeVisible();
});

test('fase SELECCIONANDO_RESPUESTA: panel muestra 2 botones (Validar, Pasar)', async ({ page }) => {
  await page.goto('/');
  const id = await setupPartidaTriviaEnCurso(page);

  await setFase(page, id, 'SELECCIONANDO_RESPUESTA');

  const botones = page.locator('#shell-panel-conductor [data-accion-conductor]');
  await expect(botones).toHaveCount(2, { timeout: 15000 });

  const validar = page.locator('#shell-panel-conductor [data-accion-conductor="validar-respuesta-trivia"]');
  const pasar = page.locator('#shell-panel-conductor [data-accion-conductor="pasar-pregunta-trivia"]');
  await expect(validar).toHaveText('Validar');
  await expect(pasar).toHaveText('Pasar');
});

test('TriviaGameUI expone accionesConductor y devuelve array en las 8 fases', async ({ page }) => {
  await page.goto('/');
  await setupPartidaTriviaEnCurso(page);

  const res = await page.evaluate(() => {
    const ui = window.cumpeo.uiRegistry.obtener('TRIVIA');
    const fases = [
      'INICIO_RONDA',
      'SELECCIONANDO_SET',
      'MOSTRANDO_PREGUNTA',
      'SELECCIONANDO_RESPUESTA',
      'MOSTRANDO_RESULTADO',
      'CAMBIO_TURNO',
      'FIN_DE_RONDA',
      'FIN_DE_JUEGO'
    ];
    const contexto = {
      equipos: [{ nombre: 'Rojo' }, { nombre: 'Azul' }],
      setsDisponibles: [{ id: 's1', nombre: 'Set 1' }]
    };
    return {
      esFuncion: typeof ui.accionesConductor === 'function',
      arrays: fases.map((f) => Array.isArray(ui.accionesConductor({ fase: f }, contexto))),
      largoINICIO: ui.accionesConductor({ fase: 'INICIO_RONDA' }, contexto).length,
      largoSELECCIONANDO_SET: ui.accionesConductor({ fase: 'SELECCIONANDO_SET' }, contexto).length,
      legacyIntacto: typeof ui.renderizarPanelConductor === 'function'
    };
  });

  expect(res.esFuncion).toBe(true);
  expect(res.arrays.length).toBe(8);
  expect(res.arrays.every(Boolean)).toBe(true);
  expect(res.largoINICIO).toBe(1);
  expect(res.largoSELECCIONANDO_SET).toBe(2);
  expect(res.legacyIntacto).toBe(true);
});
