import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from '../_helpers/auth.js';
import { setupPartidaHistoriaEnredada, iniciarPartidaHistoriaEnredada, irACOnductor, irAPublica } from './_helpers/historia-enredada.js';

test.beforeEach(loginTestUser);

test('conductor ve cards de historias disponibles', async ({ page }) => {
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-he-iniciar-juego');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-he-iniciar-ronda');
  await page.waitForTimeout(300);

  const cards = page.locator('[data-historia-id]');
  await expect(cards).toHaveCount(3, { timeout: 10000 });
});

test('cards excluyen historias usadas', async ({ page }) => {
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-he-iniciar-juego');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-he-iniciar-ronda');
  await page.waitForTimeout(300);

  // Elegir primera historia
  await page.locator('[data-historia-id]').first().click();

  // Esperar a que la fase sea PREPARANDO
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-he-empezar-actuacion');
  }, { timeout: 10000 });

  // Ciclo Eq1: actuación → votación → asignar
  await page.click('#btn-he-empezar-actuacion');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#btn-he-empezar-votacion');
  }, { timeout: 10000 });

  await page.click('#btn-he-empezar-votacion');
  await page.waitForFunction(() => {
    const panel = document.querySelector('#shell-panel-conductor');
    return panel && panel.querySelector('#input-puntos-historia');
  }, { timeout: 10000 });

  await page.fill('#input-puntos-historia', '5');
  await page.click('#btn-he-asignar-puntos');

  // Esperar a que el estado del juego cambie a Eq2
  await page.waitForFunction(async () => {
    const codigo = window.location.hash.split('/').pop();
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(codigo);
    return ctx.juegos[0].estado_juego.equipo_actual === 2;
  }, { timeout: 10000 });

  // Ahora Eq2 debe ver solo 2 cards (la 1 ya fue usada)
  const cards = page.locator('[data-historia-id]');
  await expect(cards).toHaveCount(2, { timeout: 10000 });
});

test('público ve la historia elegida', async ({ page }) => {
  test.setTimeout(60000);
  const { partidaId, codigo } = await setupPartidaHistoriaEnredada(page);
  await irACOnductor(page, partidaId);
  await waitForCumpeo(page);
  await iniciarPartidaHistoriaEnredada(page, partidaId);

  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-juego'), { timeout: 20000 });
  await page.click('#btn-he-iniciar-juego');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.querySelector('#btn-he-iniciar-ronda'), { timeout: 10000 });
  await page.click('#btn-he-iniciar-ronda');
  await page.waitForTimeout(300);
  await page.locator('[data-historia-id]').first().click();
  await page.waitForTimeout(500);
  await page.click('#btn-he-empezar-actuacion');
  await page.waitForTimeout(500);

  await irAPublica(page, codigo);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toContain('El robo');
  expect(bodyText).toContain('Dos ladrones');
});
