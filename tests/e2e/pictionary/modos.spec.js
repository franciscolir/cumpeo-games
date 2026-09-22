/* =============================================================
   Pictionary Modos — test e2e de los 4 modos de representación.
   
   Usa approach híbrido: crear partida vía helper, luego programático
   para saltar al modo deseado y verificar UI del conductor y público.
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  crearPartidaPictionary,
  iniciarPartidaPictionary,
  irAConductor,
  irAPublica,
  esperarBotonPictionary,
  obtenerContextoPictionary
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

async function saltarAModo(page, partidaId, modo) {
  await page.evaluate(async ({ pid, modo }) => {
    const { PictionaryGameDefinition } = await import('/src/games/pictionary/PictionaryGameDefinition.js');

    const aciertosNecesarios = (modo - 1) * 2;

    for (let i = 0; i < aciertosNecesarios; i++) {
      const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      const je = ctx.juegos[0];
      const estado = { ...je.estado_juego };
      const config = je.configuracion_congelada || PictionaryGameDefinition.defaultConfig;

      let nuevoEstado = PictionaryGameDefinition.seleccionarModo(estado);
      nuevoEstado = {
        ...nuevoEstado,
        palabra_actual: { modo: nuevoEstado.modo_actual, concepto: 'X' },
        prohibidas_actuales: []
      };
      nuevoEstado = PictionaryGameDefinition.iniciarTiempo(nuevoEstado);
      nuevoEstado = PictionaryGameDefinition.detenerTiempo(nuevoEstado, nuevoEstado.tiempo_restante_seg || 0);
      nuevoEstado = PictionaryGameDefinition.aplicarAcierto(nuevoEstado, config);

      await window.cumpeo.services.partida.actualizarEstadoJuego(
        pid, je.id, nuevoEstado, je.state_version,
        window.cumpeo.session.sessionId, crypto.randomUUID()
      );
    }

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    const estado = { ...je.estado_juego };

    const nuevoEstado = PictionaryGameDefinition.seleccionarModo(estado);
    const fakeItem = { modo: modo, concepto: `TEST_M${modo}`, prohibidas: modo === 1 ? ['PROH_A', 'PROH_B'] : [] };
    nuevoEstado.palabra_actual = fakeItem;
    nuevoEstado.prohibidas_actuales = fakeItem.prohibidas;

    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, je.id, nuevoEstado, je.state_version,
      window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, { pid: partidaId, modo });
}

test('modo 1: conductor ve prohibidas', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await saltarAModo(page, partidaId, 1);

  await page.waitForFunction(() => {
    const container = document.querySelector('#shell-game-container');
    return container && container.textContent.includes('Modo 1');
  }, { timeout: 10000 });

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Palabras prohibidas')).toBeVisible();
  await expect(gameArea.getByText('PROH_A')).toBeVisible();
  await expect(gameArea.getByText('PROH_B')).toBeVisible();
});

test('modo 1: público carga la partida', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await saltarAModo(page, partidaId, 1);

  await page.waitForFunction(() => {
    const container = document.querySelector('#shell-game-container');
    return container && container.textContent.includes('Modo 1');
  }, { timeout: 10000 });

  await irAPublica(page, codigo);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('Pictionary');
});

test('modo 2: conductor ve sin prohibidas', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await saltarAModo(page, partidaId, 2);

  await page.waitForFunction(() => {
    const container = document.querySelector('#shell-game-container');
    return container && container.textContent.includes('Modo 2');
  }, { timeout: 10000 });

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Gestos')).toBeVisible();
  await expect(gameArea.getByText('Palabras prohibidas')).not.toBeVisible();
});

test('modo 3: indicación Pizarra física', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await saltarAModo(page, partidaId, 3);

  await page.waitForFunction(() => {
    const container = document.querySelector('#shell-game-container');
    return container && container.textContent.includes('Modo 3');
  }, { timeout: 10000 });

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Dibujo')).toBeVisible();
  await expect(gameArea.getByText('Pizarra física')).toBeVisible();
});

test('modo 4: indicación Adivinador de espaldas', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await esperarBotonPictionary(page, '#btn-pic-iniciar-juego');
  await page.click('#btn-pic-iniciar-juego');
  await esperarBotonPictionary(page, '#btn-pic-iniciar-modo');

  await saltarAModo(page, partidaId, 4);

  await page.waitForFunction(() => {
    const container = document.querySelector('#shell-game-container');
    return container && container.textContent.includes('Modo 4');
  }, { timeout: 10000 });

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Preguntas sí/no')).toBeVisible();
  await expect(gameArea.getByText('Adivinador de espaldas')).toBeVisible();
});
