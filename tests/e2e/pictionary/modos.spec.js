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
    const aciertosNecesarios = modo - 1;

    for (let i = 0; i < aciertosNecesarios; i++) {
      const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
      const je = ctx.juegos[0];
      const estado = { ...je.estado_juego };
      const config = je.configuracion_congelada;

      let nuevoEstado = { ...estado, fase: 'MOSTRANDO_PALABRA' };
      nuevoEstado = {
        ...nuevoEstado,
        palabra_actual: { modo: nuevoEstado.modo_actual, concepto: 'X' },
        prohibidas_actuales: []
      };
      nuevoEstado = { ...nuevoEstado, fase: 'ADIVINANDO', timer_corriendo: true, turno_activo: true };
      nuevoEstado = { ...nuevoEstado, fase: 'ESPERA_VALIDACION', timer_corriendo: false, tiempo_restante_seg: 0, turno_activo: false };
      const puntos = config?.puntos_por_acierto || 10;
      const key = `puntos_equipo_${estado.equipo_actual}`;
      nuevoEstado = { ...nuevoEstado, [key]: (nuevoEstado[key] || 0) + puntos };

      nuevoEstado = avanzarTurnoSimple(nuevoEstado, config);

      await window.cumpeo.services.partida.actualizarEstadoJuego(
        pid, je.id, nuevoEstado, je.state_version,
        window.cumpeo.session.sessionId, crypto.randomUUID()
      );
    }

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    const estado = { ...je.estado_juego };

    let nuevoEstado = { ...estado, fase: 'MOSTRANDO_PALABRA' };
    const fakeItem = { modo: modo, concepto: `TEST_M${modo}`, prohibidas: modo === 1 ? ['PROH_A', 'PROH_B'] : [] };
    nuevoEstado.palabra_actual = fakeItem;
    nuevoEstado.prohibidas_actuales = fakeItem.prohibidas;

    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, je.id, nuevoEstado, je.state_version,
      window.cumpeo.session.sessionId, crypto.randomUUID()
    );

    function avanzarTurnoSimple(estado, config) {
      const palabrasPorModo = config?.palabras_por_modo || 1;
      const palabrasDelTurno = (estado.palabras_del_turno || 0) + 1;

      if (palabrasDelTurno < palabrasPorModo) {
        return { ...estado, palabra_actual_index: (estado.palabra_actual_index || 0) + 1, palabras_del_turno: palabrasDelTurno, fase: 'INICIO_RONDA', timer_corriendo: false, turno_activo: false, palabra_actual: null, prohibidas_actuales: [] };
      }

      const modoActual = estado.modo_actual || 1;
      const equipo = estado.equipo_actual;
      const base = { ...estado, palabra_actual_index: 0, palabras_del_turno: 0, fase: 'INICIO_RONDA', timer_corriendo: false, turno_activo: false, palabra_actual: null, prohibidas_actuales: [] };

      if (modoActual < 4) return { ...base, modo_actual: modoActual + 1 };
      if (equipo === 1) return { ...base, equipo_actual: 2, modo_actual: 1 };

      const ronda = estado.ronda_actual || 1;
      const totalRondas = estado.total_rondas || 1;
      const keyTurnos = `turnos_completados_equipo_${equipo}`;
      const turnosCompletados = (estado[keyTurnos] || 0) + 1;
      const nuevoEstado = { ...base, [keyTurnos]: turnosCompletados };

      if (ronda >= totalRondas) return { ...nuevoEstado, fase: 'FIN_DE_JUEGO', timer_corriendo: false, turno_activo: false };
      return { ...nuevoEstado, ronda_actual: ronda + 1, modo_actual: 1, equipo_actual: 1, fase: 'FIN_DE_RONDA', timer_corriendo: false, turno_activo: false };
    }
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

test('modo 1: público carga la partida y muestra concepto y prohibidas', async ({ page }) => {
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

  const body = page.locator('body');
  await expect(body).toBeVisible();
  const bodyText = await body.textContent();
  expect(bodyText).toContain('Pictionary');
  expect(bodyText).toContain('TEST_M1');
  expect(bodyText).toContain('PROH_A');
  expect(bodyText).toContain('PROH_B');
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
