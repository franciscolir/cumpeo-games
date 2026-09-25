import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaHistoriaEnredada, iniciarPartidaHistoriaEnredada, irACOnductor, irAPublica } from './_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

test('conductor ve cards de historias disponibles', async ({ page }) => {
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

  const cards = page.locator('[data-accion-conductor="seleccionar-historia-historia"]');
  await expect(cards).toHaveCount(3, { timeout: 10000 });
});

test('cards excluyen historias usadas', async ({ page }) => {
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

  // Elegir primera historia
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();

  // Esperar a que la fase sea PREPARANDO
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="empezar-actuacion-historia"]');
  }, { timeout: 10000 });

  // Ciclo Eq1: actuación → votación → asignar
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="empezar-votacion-historia"]');
  }, { timeout: 10000 });

  await page.click('[data-accion-conductor="empezar-votacion-historia"]');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('[data-accion-conductor="asignar-puntos-historia"]');
  }, { timeout: 10000 });

  await page.fill('[data-accion-conductor="asignar-puntos-historia"]', '5');
  await page.press('[data-accion-conductor="asignar-puntos-historia"]', 'Tab');

  // Esperar a que el estado del juego cambie a Eq2
  await page.waitForFunction(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego.equipo_actual === 2;
  }, { timeout: 10000 });

  // Ahora Eq2 debe ver solo 2 cards (la 1 ya fue usada)
  const cards = page.locator('[data-accion-conductor="seleccionar-historia-historia"]');
  await expect(cards).toHaveCount(2, { timeout: 10000 });
});

test('público ve la historia elegida', async ({ page }) => {
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
  await page.locator('[data-accion-conductor="seleccionar-historia-historia"]').first().click();
  await page.waitForTimeout(500);
  await page.click('[data-accion-conductor="empezar-actuacion-historia"]');
  await page.waitForTimeout(500);

  await irAPublica(page, codigo);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('El robo');
  expect(bodyText).toContain('Dos ladrones');
});
