import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupPartidaCompleta(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Movil ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Movil ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `MV${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { codigo: partida.public_codigo, partidaId: partida.id };
  });
}

test('móvil carga en una partida existente', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('CUMPEO').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('La partida comenzará en breve')).toBeVisible({ timeout: 15000 });
});

test('móvil muestra marcador de ambos equipos', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  const marcador = page.getByText('Marcador');
  await expect(marcador).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Rojo')).toBeVisible();
  await expect(page.getByText('Azul')).toBeVisible();
  await expect(page.locator('.font-comic-score').first()).toBeVisible();
});

test('móvil con código inválido muestra "no encontrada"', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  await page.goto('/#/movil/INVALIDOCODIGO');
  await waitForCumpeo(page);
  await expect(page.getByText('Partida no encontrada')).toBeVisible({ timeout: 15000 });
});

test('móvil no muestra botones de control (AC-VISUAL-M-01)', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('CUMPEO').first()).toBeVisible({ timeout: 15000 });
  const botonesControl = page.locator('button[data-accion]');
  await expect(botonesControl).toHaveCount(0);
  const btnTomarControl = page.locator('#btn-tomar-control');
  await expect(btnTomarControl).toHaveCount(0);
  const btnComenzar = page.locator('#btn-comenzar');
  await expect(btnComenzar).toHaveCount(0);
});
