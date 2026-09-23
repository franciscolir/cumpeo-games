/* =============================================================
   Rosco Validación de Set — test e2e de validación de sets.
   
   Cubre: set inválido (letras incorrectas, items insuficientes)
   rechazado por el modal de inicio + flujo con set válido.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { iniciarJuegoRoscoConSets } from './_helpers/rosco.js';

test.beforeEach(loginTestUser);

test('iniciar juego Rosco muestra error si el set tiene letras inválidas', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);

  const { partidaId, setId } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const rosco = juegos.find((j) => j.codigo === 'ROSCO');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: rosco.id,
      nombre: `Rosco BadSet ${uid}`
    });

    const letrasInvalidas = ['A', 'B', 'C', '1', '@'];
    for (const letra of letrasInvalidas) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        letra,
        definicion: `Def ${letra}`,
        respuesta: `Resp ${letra}`,
        ronda: 1
      });
    }

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Rosco Bad Circuit ${uid}`,
      juegos: [{
        juego_id: rosco.id,
        configuracion: { rondas: 1, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Rosco Bad Circuit ${uid}`,
        juegos: [{
          juego_id: rosco.id,
          configuracion: { rondas: 1, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `RB${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, setId: set.id };
  });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, je.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);

  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-juego');
  }, { timeout: 15000 });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await iniciarJuegoRoscoConSets(page, { sets: [{ id: setId }], rondas: 1 });
  await page.waitForTimeout(500);

  const roscoLetters = page.locator('[data-letra]');
  const count = await roscoLetters.count();
  expect(count).toBe(0);
});

test('iniciar juego Rosco acepta set con todas las letras válidas', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);

  const { partidaId, setId } = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const rosco = juegos.find((j) => j.codigo === 'ROSCO');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: rosco.id,
      nombre: `Rosco GoodSet ${uid}`
    });

    const alfabeto = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'
    ];

    for (const letra of alfabeto) {
      await window.cumpeo.services.set.agregarItem(set.id, {
        letra,
        definicion: `Def ${letra}`,
        respuesta: `Resp ${letra}`,
        ronda: 1
      });
    }

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Rosco Good Circuit ${uid}`,
      juegos: [{
        juego_id: rosco.id,
        configuracion: { rondas: 1, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 }
      }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Rosco Good Circuit ${uid}`,
        juegos: [{
          juego_id: rosco.id,
          configuracion: { rondas: 1, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 }
        }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `RG${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, setId: set.id };
  });

  await page.goto(`/#/partidas/${partidaId}`);
  await waitForCumpeo(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, je.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, partidaId);

  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-rosco-iniciar-juego');
  }, { timeout: 15000 });

  await iniciarJuegoRoscoConSets(page, { sets: [{ id: setId }], rondas: 1 });
  await page.waitForTimeout(300);

  await expect(page.locator('[data-letra="A"]')).toBeVisible({ timeout: 10000 });
});
