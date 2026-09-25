import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaHistoriaEnredada, iniciarPartidaHistoriaEnredada, irACOnductor } from './_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

test('crear partida + iniciar + elegir historia', async ({ page }) => {
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  

  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  // Iniciar juego
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="iniciar-juego-historia"]');
  }, { timeout: 20000 });

  await page.click('[data-accion-conductor="iniciar-juego-historia"]');
  await page.waitForTimeout(300);

  // Iniciar ronda
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="iniciar-ronda-historia"]');
  }, { timeout: 10000 });

  await page.click('[data-accion-conductor="iniciar-ronda-historia"]');
  await page.waitForTimeout(300);

  // Elegir primera historia
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="seleccionar-historia-historia"]');
  }, { timeout: 10000 });

  const primeraCard = page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first();
  await primeraCard.click();
  await page.waitForTimeout(500);

  // Verificar que estamos en PREPARANDO
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="empezar-actuacion-historia"]');
  }, { timeout: 10000 });
});

test('ciclo completo Eq1: elegir → preparar → actuar → votar → asignar puntos', async ({ page }) => {
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

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-actuacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-votacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);

  await page.waitForFunction(() => document.querySelector('#input-puntos-historia'), { timeout: 10000 });
  await page.fill('#input-puntos-historia', '7');
  await page.click('#btn-he-asignar-puntos');
  await page.waitForTimeout(500);

  // Verificar que Eq1 tiene 7 puntos
  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.puntos_equipo_1).toBe(7);
  expect(ctx.equipo_actual).toBe(2);
});

test('ciclo Eq1 + Eq2 → FIN_DE_RONDA', async ({ page }) => {
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

  // Ciclo Eq1
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-actuacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-votacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#input-puntos-historia'), { timeout: 10000 });
  await page.fill('#input-puntos-historia', '5');
  await page.click('#btn-he-asignar-puntos');
  await page.waitForTimeout(500);

  // Ciclo Eq2
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="seleccionar-historia-historia"]'), { timeout: 10000 });
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-actuacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('[data-accion-conductor="empezar-votacion-historia"]'), { timeout: 10000 });
  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#input-puntos-historia'), { timeout: 10000 });
  await page.fill('#input-puntos-historia', '8');
  await page.click('#btn-he-asignar-puntos');
  await page.waitForTimeout(500);

  // Verificar FIN_DE_RONDA
  const ctx = await page.evaluate(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego;
  });
  expect(ctx.fase).toBe('FIN_DE_RONDA');
  expect(ctx.puntos_equipo_1).toBe(5);
  expect(ctx.puntos_equipo_2).toBe(8);
});
