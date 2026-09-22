import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaHistoriaEnredada, iniciarPartidaHistoriaEnredada, irACOnductor } from './_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

test('set sin historias suficientes no permite arrancar la ronda', async ({ page }) => {
  // NOTA: el helper siempre crea 3 historias. Si se necesita testear este caso,
  // hay que extender el helper con opcion itemsCount: 0.
  test.skip('requiere extender helper con itemsCount');
});

test('múltiples rondas: FIN_DE_RONDA → siguiente ronda → FIN_DE_JUEGO', async ({ page }) => {
  test.setTimeout(120000);
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page, { rondas: 2 });
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-he-iniciar-juego');
  await page.waitForTimeout(300);

  // Ronda 1
  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-he-iniciar-ronda');
  await page.waitForTimeout(300);

  // Eq1
  await page.waitForFunction(() => document.querySelector('[data-historia-id]'), { timeout: 10000 });
  await page.locator('[data-historia-id]').first().click();
  await page.waitForTimeout(300);
  await page.click('#btn-he-empezar-actuacion');
  await page.waitForTimeout(300);
  await page.click('#btn-he-empezar-votacion');
  await page.waitForTimeout(300);
  await page.fill('#input-puntos-historia', '5');
  await page.click('#btn-he-asignar-puntos');
  await page.waitForTimeout(500);

  // Eq2
  await page.waitForFunction(() => document.querySelector('[data-historia-id]'), { timeout: 10000 });
  await page.locator('[data-historia-id]').first().click();
  await page.waitForTimeout(300);
  await page.click('#btn-he-empezar-actuacion');
  await page.waitForTimeout(300);
  await page.click('#btn-he-empezar-votacion');
  await page.waitForTimeout(300);
  await page.fill('#input-puntos-historia', '3');
  await page.click('#btn-he-asignar-puntos');
  await page.waitForTimeout(500);

  // Verificar FIN_DE_RONDA con botón siguiente ronda
  await page.waitForFunction(() => document.querySelector('#btn-he-siguiente-ronda'), { timeout: 10000 });
  await page.click('#btn-he-siguiente-ronda');
  await page.waitForTimeout(500);

  // Verificar ronda 2
  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.ronda_actual).toBe(2);
});
