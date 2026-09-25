import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaHistoriaEnredada, iniciarPartidaHistoriaEnredada, irACOnductor } from './_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

async function jugarTurno(page, puntos) {
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-actuacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-votacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="asignar-puntos-historia"]'), { timeout: 10000 });
  await page.fill('[data-accion-conductor="asignar-puntos-historia"]', String(puntos));
  await page.press('[data-accion-conductor="asignar-puntos-historia"]', 'Tab');
  await page.waitForTimeout(500);
}

test('asignar puntos a Eq1 suma al Eq1', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-historia"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-historia"]');
  await page.waitForTimeout(300);

  await jugarTurno(page, 7);

  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.puntos_equipo_1).toBe(7);
  expect(ctx.puntos_equipo_2).toBe(0);
});

test('asignar puntos a Eq2 suma al Eq2', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-juego-historia"]'), { timeout: 20000 });
  await page.click('[data-accion-conductor="iniciar-juego-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="iniciar-ronda-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="iniciar-ronda-historia"]');
  await page.waitForTimeout(300);

  await jugarTurno(page, 5);
  await jugarTurno(page, 9);

  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.puntos_equipo_1).toBe(5);
  expect(ctx.puntos_equipo_2).toBe(9);
});
