/* =============================================================
   E2E Móvil Helper — funciones compartidas para tests del móvil.
   ============================================================= */

import { expect } from '@playwright/test';
import { waitForCumpeo } from './auth.js';

/**
 * Navega al móvil con un código de partida, espera a que cumpeo boote
 * y completa el formulario de identificación.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} codigo - public_codigo de la partida
 * @param {string} nombre - nombre del participante
 */
export async function identificarEnMovil(page, codigo, nombre) {
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await page.locator('#movil-nombre').fill(nombre);
  await page.locator('#movil-continuar').click();
}

/**
 * Hace clic en la opción de voto indicada y verifica la confirmación.
 * Espera a que el botón sea visible (necesario tras reload o cambio de fase).
 *
 * @param {import('@playwright/test').Page} page
 * @param {'A' | 'B'} opcion
 */
export async function votarMovil(page, opcion) {
  const btn = opcion === 'A' ? '#movil-voto-a' : '#movil-voto-b';
  await expect(page.locator(btn)).toBeVisible({ timeout: 15000 });
  await page.locator(btn).click();
  await expect(page.getByText('Respuesta enviada. Esperando...')).toBeVisible({ timeout: 10000 });
}
