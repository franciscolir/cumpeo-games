/* =============================================================
   Pictionary Validación de Set — test e2e de validación.

   Cubre: set vacío del submodo PREGUNTAS → al elegirlo el shell
   muestra alerta "Set inválido" y NO avanza de fase (el juego ya
   no valida al iniciar la partida, solo al elegir el set).
   Selectores: descriptores `data-accion-conductor` (8.5d).
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import {
  crearSetPictionary,
  iniciarPartidaPictionary,
  obtenerContextoPictionary,
  irAConductor,
  esperarBotonPictionary,
  accionSelector
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

test('set vacío del submodo PREGUNTAS muestra alerta y no avanza de fase', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);

  const { juegoId } = await crearSetPictionary(page, { submodos: ['PALABRAS', 'GESTOS'] });

  const { partidaId } = await page.evaluate(async (juegoId) => {
    const uid = Date.now().toString(36);

    await window.cumpeo.services.set.crearSet({
      juego_id: juegoId,
      nombre: `Pictionary PREGUNTAS Vacio E2E ${uid}`,
      submodo: 'PREGUNTAS'
    });

    const config = {
      rondas: 1,
      palabras_por_turno: 1,
      segundos_por_modo: 30,
      puntos_por_acierto: 10,
      penalizacion_por_error: 0,
      penalizacion_por_pasar: 0,
      bonus_puntos: 5
    };

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Pictionary BadSet Circuit ${uid}`,
      juegos: [{ juego_id: juegoId, configuracion: config }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Pictionary BadSet Circuit ${uid}`,
        juegos: [{ juego_id: juegoId, configuracion: config }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `PV${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { partidaId: partida.id };
  }, juegoId);

  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  const iniciar = accionSelector('iniciar-juego-pictionary');
  await esperarBotonPictionary(page, iniciar);

  let dialogMsg = '';
  page.on('dialog', async (dialog) => {
    dialogMsg = dialog.message();
    await dialog.accept();
  });

  await page.click(iniciar);
  const submodo = accionSelector('elegir-submodo-pictionary', '{"submodo":"PREGUNTAS"}');
  await esperarBotonPictionary(page, submodo);
  await page.click(submodo);
  const elegirSet = accionSelector('elegir-set-pictionary');
  await esperarBotonPictionary(page, elegirSet);
  await page.click(elegirSet);

  await expect.poll(() => dialogMsg, { timeout: 5000 }).toContain('Set inválido');
  expect(dialogMsg).toContain('items no puede estar vacío');

  const ctx = await obtenerContextoPictionary(page, partidaId);
  expect(ctx.estadoJuego.fase).toBe('SELECCIONANDO_SET');
  expect(ctx.estadoJuego.submodo_actual).toBe('PREGUNTAS');

  const panel = page.locator('#shell-panel-conductor');
  await expect(panel.locator(elegirSet)).toBeVisible();
  await expect(panel.locator(accionSelector('iniciar-tiempo-pictionary'))).toHaveCount(0);
});
