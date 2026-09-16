import { test, expect } from '@playwright/test';

async function setupCircuitoYPartida(page) {
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: 'Test Circuito',
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: 'Test Circuito',
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    return circuito.id;
  });
}

test('navegar de dashboard a lista de partidas', async ({ page }) => {
  await page.goto('/');
  await page.click('a[href="#/partidas"]');
  await expect(page.getByText('Partidas', { exact: true }).first()).toBeVisible();
});

test('empty state sin partidas', async ({ page }) => {
  await page.goto('/#/partidas');
  await expect(page.getByText('No hay partidas activas')).toBeVisible();
});

test('crear partida desde circuito LISTO', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  await expect(page.getByText(/Partida:/)).toBeVisible();
});

test('partida aparece en la lista', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);
  const partidaId = page.url().split('/').pop();

  await page.goto('/#/partidas');
  await expect(page.getByText('Test Circuito')).toBeVisible({ timeout: 10000 });
});

test('ir a la consola desde la lista', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);

  await page.goto('/#/partidas');
  await page.click('a:has-text("Ir a la consola")');
  await expect(page.getByText(/Partida:/)).toBeVisible();
});

test('tomar control en la consola', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);

  const btnTomar = page.locator('button[data-accion="tomar-control"]');
  if (await btnTomar.isVisible()) {
    await btnTomar.click();
    await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });
  }
});

test('comenzar partida', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);

  await page.locator('button[data-accion="tomar-control"]').click();
  await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('button[data-accion="comenzar"]').click();
  await expect(page.getByText('EN_CURSO')).toBeVisible({ timeout: 10000 });
});

test('descartar partida', async ({ page }) => {
  await page.goto('/');
  await setupCircuitoYPartida(page);
  await page.goto('/#/partidas/nueva');
  await page.click('button[type="submit"]');
  await page.waitForURL(/#\/partidas\/[^/]+$/);

  await page.locator('button[data-accion="tomar-control"]').click();
  await expect(page.getByText('Tenés el control')).toBeVisible({ timeout: 10000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('button[data-accion="comenzar"]').click();
  await expect(page.getByText('EN_CURSO')).toBeVisible({ timeout: 10000 });

  await expect(page.locator('button[data-accion="descartar"]')).toBeVisible({ timeout: 10000 });
  await page.locator('button[data-accion="descartar"]').click();
  await expect(page.getByText('No hay partidas activas')).toBeVisible({ timeout: 10000 });
});
