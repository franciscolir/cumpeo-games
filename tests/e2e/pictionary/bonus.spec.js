/* =============================================================
   Pictionary Bonus — test e2e de bonus manual (8.5d).

   Cubre: aplicar bonus a Eq1 y Eq2 con el descriptor `input`
   (`aplicar-bonus-pictionary` + payload { equipo }) en la fase
   ADIVINANDO. El binding `input` dispara en `change`, así que
   el test hace fill + Tab (patrón de 8.5c.2a).
   ============================================================= */

import { test, expect } from '@playwright/test';
import { loginTestUser } from '../_helpers/auth.js';
import {
  crearPartidaPictionary,
  iniciarPartidaPictionary,
  obtenerContextoPictionary,
  irAConductor,
  esperarBotonPictionary,
  empezarTurnoUI,
  accionSelector
} from './_helpers/pictionary.js';

test.beforeEach(loginTestUser);

test('aplicar bonus a Eq1 suma 5 puntos', async ({ page }) => {
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  const iniciar = accionSelector('iniciar-juego-pictionary');
  await esperarBotonPictionary(page, iniciar);
  await page.click(iniciar);
  await empezarTurnoUI(page);

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.fase).toBe('ADIVINANDO');
  expect(ctx1.estadoJuego.puntos_equipo_1).toBe(0);

  const input = page.locator(
    `input${accionSelector('aplicar-bonus-pictionary', '{"equipo":1}')}`
  );
  await expect(input).toBeVisible();
  await input.fill('5');
  await input.press('Tab');
  await page.waitForTimeout(300);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_1).toBe(5);
  expect(ctx2.estadoJuego.fase).toBe('ADIVINANDO');
});

test('aplicar bonus a Eq2 suma 5 puntos', async ({ page }) => {
  const { partidaId } = await crearPartidaPictionary(page);
  await irAConductor(page, partidaId);
  await iniciarPartidaPictionary(page, partidaId);

  const iniciar = accionSelector('iniciar-juego-pictionary');
  await esperarBotonPictionary(page, iniciar);
  await page.click(iniciar);
  await empezarTurnoUI(page);

  const ctx1 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx1.estadoJuego.fase).toBe('ADIVINANDO');
  expect(ctx1.estadoJuego.puntos_equipo_2).toBe(0);

  const input = page.locator(
    `input${accionSelector('aplicar-bonus-pictionary', '{"equipo":2}')}`
  );
  await expect(input).toBeVisible();
  await input.fill('5');
  await input.press('Tab');
  await page.waitForTimeout(300);

  const ctx2 = await obtenerContextoPictionary(page, partidaId);
  expect(ctx2.estadoJuego.puntos_equipo_2).toBe(5);
  expect(ctx2.estadoJuego.fase).toBe('ADIVINANDO');
});
