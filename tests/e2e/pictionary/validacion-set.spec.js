/* =============================================================
   Pictionary Validación de Set — test e2e de validación.
   
   Cubre: set sin items del modo 3 → iniciar juego falla.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  crearSetPictionary,
  irAConductor,
  esperarBotonPictionary
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

test('set sin items del modo 3 no permite iniciar juego', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);

  const { juegoId } = await crearSetPictionary(page);

  await page.evaluate(async (juegoId) => {
    const uid = Date.now().toString(36);

    const setVacio = await window.cumpeo.services.set.crearSet({
      juego_id: juegoId,
      nombre: `Pictionary BadSet ${uid}`
    });

    for (let i = 0; i < 2; i++) {
      await window.cumpeo.services.set.agregarItem(setVacio.id, {
        modo: 1,
        concepto: `Concepto M1 ${i}`,
        prohibidas: ['prohibida_a', 'prohibida_b']
      });
      await window.cumpeo.services.set.agregarItem(setVacio.id, {
        modo: 2,
        concepto: `Concepto M2 ${i}`
      });
      await window.cumpeo.services.set.agregarItem(setVacio.id, {
        modo: 4,
        concepto: `Concepto M4 ${i}`
      });
    }

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pictionary Bad Circuit ${uid}`,
      juegos: [{
        juego_id: juegoId,
        configuracion: {
          rondas: 1,
          palabras_por_modo: 1,
          segundos_por_modo: 3,
          puntos_por_acierto: 10,
          penalizacion_por_error: 0,
          penalizacion_por_pasar: 0,
          bonus_puntos: 5
        }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Pictionary Bad Circuit ${uid}`,
        juegos: [{
          juego_id: juegoId,
          configuracion: {
            rondas: 1,
            palabras_por_modo: 1,
            segundos_por_modo: 3,
            puntos_por_acierto: 10,
            penalizacion_por_error: 0,
            penalizacion_por_pasar: 0,
            bonus_puntos: 5
          }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PB${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    window._picPartidaId = partida.id;
    window._picCodigo = codigo;
  }, juegoId);

  const partidaId = await page.evaluate(() => window._picPartidaId);
  const codigo = await page.evaluate(() => window._picCodigo);

  await irAConductor(page, partidaId);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, je.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.click('#btn-pic-iniciar-juego');
  await page.waitForTimeout(500);

  const ctx = await page.evaluate(async (pid) => {
    const w = window;
    const ctx = await w.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    return { fase: je.estado_juego?.fase };
  }, partidaId);

  expect(ctx.fase).not.toBe('INICIO_RONDA');
});
