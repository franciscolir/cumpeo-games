/* =============================================================
   Pictionary Modos — test e2e de los 4 submodos de representación.

   Usa el motor real del shell (`saltarASubmodoPictionary`): juega
   los turnos previos con las acciones del conductor hasta llegar a
   MOSTRANDO_PALABRA del submodo objetivo, y verifica la UI del
   conductor (y del público en PALABRAS).
   Selectores: descriptores `data-accion-conductor` (8.5d).
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  crearPartidaPictionary,
  iniciarPartidaPictionary,
  irAConductor,
  irAPublica,
  esperarBotonPictionary,
  saltarASubmodoPictionary,
  accionSelector
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

async function iniciarYEsperarSubmodo(page) {
  const iniciar = accionSelector('iniciar-juego-pictionary');
  await esperarBotonPictionary(page, iniciar);
  await page.click(iniciar);
  await esperarBotonPictionary(
    page,
    accionSelector('elegir-submodo-pictionary', '{"submodo":"PALABRAS"}')
  );
}

test('submodo PALABRAS: conductor ve concepto y palabras prohibidas', async ({ page }) => {
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await iniciarYEsperarSubmodo(page);

  await saltarASubmodoPictionary(page, partidaId, 'PALABRAS');

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Submodo — Palabras prohibidas', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('PALABRAS_CONCEPTO_0', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('Palabras prohibidas', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('PALABRAS_PROH_A_0', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('PALABRAS_PROH_B_0', { exact: true })).toBeVisible();
});

test('submodo PALABRAS: público ve concepto y palabras prohibidas', async ({ page }) => {
  const { partidaId, codigo } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await iniciarYEsperarSubmodo(page);

  await saltarASubmodoPictionary(page, partidaId, 'PALABRAS');

  await irAPublica(page, codigo);
  await page.waitForFunction(
    () => document.body.textContent.includes('PALABRAS_CONCEPTO_0'),
    { timeout: 15000 }
  );

  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('Pictionary');
  expect(bodyText).toContain('PALABRAS_CONCEPTO_0');
  expect(bodyText).toContain('Palabras prohibidas');
  expect(bodyText).toContain('PALABRAS_PROH_A_0');
  expect(bodyText).toContain('PALABRAS_PROH_B_0');
});

test('submodo GESTOS: conductor ve gestos, sin palabras prohibidas', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await iniciarYEsperarSubmodo(page);

  await saltarASubmodoPictionary(page, partidaId, 'GESTOS');

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Submodo — Gestos', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('GESTOS_CONCEPTO_0', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('El representante usa gestos. Sin palabras en pantalla.')).toBeVisible();
  await expect(gameArea.getByText('Palabras prohibidas', { exact: true })).not.toBeVisible();
});

test('submodo PREGUNTAS: conductor ve Preguntas sí/no y Adivinador de espaldas', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await iniciarYEsperarSubmodo(page);

  await saltarASubmodoPictionary(page, partidaId, 'PREGUNTAS');

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Submodo — Preguntas sí/no', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('PREGUNTAS_CONCEPTO_0', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('Adivinador de espaldas')).toBeVisible();
  await expect(gameArea.getByText('Palabras prohibidas', { exact: true })).not.toBeVisible();
});

test('submodo DIBUJO: conductor ve Dibujo y Pizarra física', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  await iniciarYEsperarSubmodo(page);

  await saltarASubmodoPictionary(page, partidaId, 'DIBUJO');

  const gameArea = page.locator('#shell-game-container');
  await expect(gameArea.getByText('Submodo — Dibujo', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('DIBUJO_CONCEPTO_0', { exact: true })).toBeVisible();
  await expect(gameArea.getByText('Pizarra física')).toBeVisible();
  await expect(gameArea.getByText('Palabras prohibidas', { exact: true })).not.toBeVisible();
});
