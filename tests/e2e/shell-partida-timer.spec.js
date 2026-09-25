/* =============================================================
   Shell Partida Timer — e2e del #shell-timer unificado (step 8.2).

   Cubre: visible con juego que expone tiempo_restante_seg,
   oculto con juego sin timer, formato SS / MM:SS.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';
import {
  crearSetPictionary,
  iniciarPartidaPictionary,
  irAConductor,
  esperarBotonPictionary
} from './pictionary/_helpers/pictionary.js';
import {
  setupPartidaHistoriaEnredada,
  iniciarPartidaHistoriaEnredada,
  irACOnductor
} from './historia-enredada/_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

async function crearPartidaPictionaryConTimer(page) {
  await waitForCumpeo(page);
  const { juegoId } = await crearSetPictionary(page);

  return await page.evaluate(async ({ juegoId }) => {
    const uid = Date.now().toString(36);
    const config = {
      rondas: 1,
      palabras_por_turno: 1,
      segundos_por_modo: 90,
      puntos_por_acierto: 10,
      penalizacion_por_error: 0,
      penalizacion_por_pasar: 0,
      bonus_puntos: 5
    };
    const equipos = [
      { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
      { posicion: 2, nombre: 'Azul', color: '#3182CE' }
    ];

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Shell Timer Circuit ${uid}`,
      juegos: [{ juego_id: juegoId, configuracion: config }],
      equipos
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      { nombre: `Shell Timer Circuit ${uid}`, juegos: [{ juego_id: juegoId, configuracion: config }], equipos, estado: 'LISTO' }
    );

    const codigo = `ST${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id, codigo: partida.public_codigo };
  }, { juegoId });
}

async function prepararPictionaryConTiempo(page) {
  const { partidaId } = await crearPartidaPictionaryConTimer(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.evaluate(() => window.__shellPartidaCallbacks.onAccion('iniciar-juego-pictionary', {}));

  return partidaId;
}

test('#shell-timer visible cuando el juego expone tiempo_restante_seg (Pictionary)', async ({ page }) => {
  await prepararPictionaryConTiempo(page);
  await expect(page.locator('#shell-timer')).toBeVisible({ timeout: 10000 });
});

test('#shell-timer NO existe cuando el juego no tiene timer (Historia Enredada)', async ({ page }) => {
  const { partidaId } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-historia"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-historia"]');
  await page.waitForTimeout(300);

  await expect(page.locator('#shell-timer')).toHaveCount(0);
});

test('#shell-timer muestra el tiempo en formato SS o MM:SS', async ({ page }) => {
  await prepararPictionaryConTiempo(page);

  const timer = page.locator('#shell-timer');
  await expect(timer).toBeVisible({ timeout: 10000 });

  const texto = (await timer.textContent()).trim();
  expect(texto).toMatch(/^\d{1,2}(:\d{2})?$/);
});
