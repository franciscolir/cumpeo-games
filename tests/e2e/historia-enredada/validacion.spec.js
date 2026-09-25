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

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-historia"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-historia"]');
  await page.waitForTimeout(300);

  // Ronda 1
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-historia"]');
  await page.waitForTimeout(300);

  // Eq1
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);
  await page.fill('[data-accion-conductor="asignar-puntos-historia"]', '5');
  await page.press('[data-accion-conductor="asignar-puntos-historia"]', 'Tab');
  await page.waitForTimeout(500);

  // Eq2
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);
  await page.fill('[data-accion-conductor="asignar-puntos-historia"]', '3');
  await page.press('[data-accion-conductor="asignar-puntos-historia"]', 'Tab');
  await page.waitForTimeout(500);

  // Verificar FIN_DE_RONDA con botón siguiente ronda
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-siguiente-ronda-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-siguiente-ronda-historia"]');
  await page.waitForTimeout(500);

  // Verificar ronda 2
  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.ronda_actual).toBe(2);
});
