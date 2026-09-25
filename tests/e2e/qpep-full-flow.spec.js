/* =============================================================
   QPEP Full Flow — test e2e end-to-end del flujo completo
   "¿Qué piensa el público?" con 2 rondas y móvil real.

   Verifica:
   - Conductor + móvil en dos pestañas separadas
   - Voto del móvil se refleja al cerrar encuesta
   - Puntaje acumulado correcto tras 2 rondas
   - Estado final FIN_DE_JUEGO
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';
import { identificarEnMovil, votarMovil } from './_helpers/movil.js';

test.beforeEach(loginTestUser);

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */

async function setupPartidaQPEPFull(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const qpep = juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: qpep.id,
      nombre: `QPEP Full ${uid}`
    });

    await window.cumpeo.services.set.agregarItem(set.id, {
      pregunta: '¿Pizza o empanadas?',
      opcion_a: 'Pizza',
      opcion_b: 'Empanadas'
    });

    await window.cumpeo.services.set.agregarItem(set.id, {
      pregunta: '¿PlayStation o Xbox?',
      opcion_a: 'PlayStation',
      opcion_b: 'Xbox'
    });

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `QPEP Full Circuit ${uid}`,
      juegos: [{ juego_id: qpep.id, configuracion: { rondas: 2, tiempo_por_pregunta_seg: 30, puntos_por_acierto: 10 } }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `QPEP Full Circuit ${uid}`,
        juegos: [{ juego_id: qpep.id, configuracion: { rondas: 2, tiempo_por_pregunta_seg: 30, puntos_por_acierto: 10 } }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `QF${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id, codigo: partida.public_codigo };
  });
}

async function prepararPartida(page, id) {
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);
}

async function leerEstado(page, partidaId) {
  return await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    return {
      fase: je?.estado_juego?.fase,
      resultado_publico: je?.estado_juego?.resultado_publico,
      puntos_equipo_1: je?.estado_juego?.puntos_equipo_1,
      puntos_equipo_2: je?.estado_juego?.puntos_equipo_2,
      pregunta_actual_index: je?.estado_juego?.pregunta_actual_index,
      ronda_actual: je?.estado_juego?.ronda_actual
    };
  }, partidaId);
}

/* -------------------------------------------------------------
   Test principal: 2 rondas completas con móvil real
   ------------------------------------------------------------- */

test('flujo QPEP end-to-end: 2 rondas completas con móvil real', async ({ browser }, testInfo) => {
  testInfo.setTimeout(90000);

  const context = await browser.newContext();
  const pageConductor = await context.newPage();
  const pageMovil = await context.newPage();

  await loginTestUser({ page: pageConductor });

  await pageConductor.goto('/');
  const { id, codigo } = await setupPartidaQPEPFull(pageConductor);

  await prepararPartida(pageConductor, id);

  await pageConductor.goto(`/#/partidas/${id}`);
  await waitForCumpeo(pageConductor);

  await identificarEnMovil(pageMovil, codigo, 'Votante E2E');

  /* === RONDA 1 === */

  await pageConductor.locator('[data-accion-conductor="cambiar-estado-juego"]').filter({ hasText: 'Iniciar juego' }).click();
  await pageConductor.waitForTimeout(500);
  await pageConductor.locator('[data-accion-conductor="cambiar-estado-juego"]').filter({ hasText: 'Iniciar encuesta' }).click();
  await pageConductor.waitForTimeout(500);

  await votarMovil(pageMovil, 'A');

  await pageConductor.locator('[data-accion-conductor="cerrar-encuesta"]').click();
  await pageConductor.waitForTimeout(1000);

  let estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('ENCUESTA_CERRADA');
  expect(estado.resultado_publico).toBe('A');

  await pageConductor.locator(`[data-accion-payload='{"equipo":1,"valor":"A"}']`).click();
  await pageConductor.waitForTimeout(300);
  await pageConductor.locator(`[data-accion-payload='{"equipo":2,"valor":"B"}']`).click();
  await pageConductor.waitForTimeout(300);
  await pageConductor.locator('[data-accion-conductor="revelar-qpep"]').click();
  await pageConductor.waitForTimeout(1000);

  estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('REVELANDO');
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.puntos_equipo_2).toBe(0);

  await pageConductor.locator('[data-accion-conductor="siguiente-qpep"]').click();
  await pageConductor.waitForTimeout(1000);

  estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('SELECCIONANDO_PREGUNTA');
  expect(estado.pregunta_actual_index).toBe(1);

  /* === RONDA 2 === */

  await pageConductor.locator('[data-accion-conductor="cambiar-estado-juego"]').filter({ hasText: 'Iniciar encuesta' }).click();
  await pageConductor.waitForTimeout(500);

  await votarMovil(pageMovil, 'B');

  await pageConductor.locator('[data-accion-conductor="cerrar-encuesta"]').click();
  await pageConductor.waitForTimeout(1000);

  estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('ENCUESTA_CERRADA');
  expect(estado.resultado_publico).toBe('B');

  await pageConductor.locator(`[data-accion-payload='{"equipo":1,"valor":"A"}']`).click();
  await pageConductor.waitForTimeout(300);
  await pageConductor.locator(`[data-accion-payload='{"equipo":2,"valor":"B"}']`).click();
  await pageConductor.waitForTimeout(300);
  await pageConductor.locator('[data-accion-conductor="revelar-qpep"]').click();
  await pageConductor.waitForTimeout(1000);

  estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('REVELANDO');
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.puntos_equipo_2).toBe(10);

  await pageConductor.locator('[data-accion-conductor="siguiente-qpep"]').click();
  await pageConductor.waitForTimeout(1000);

  /* === VERIFICACIÓN FINAL === */

  estado = await leerEstado(pageConductor, id);
  expect(estado.fase).toBe('FIN_DE_JUEGO');
  expect(estado.puntos_equipo_1).toBe(10);
  expect(estado.puntos_equipo_2).toBe(10);

  await context.close();
});
