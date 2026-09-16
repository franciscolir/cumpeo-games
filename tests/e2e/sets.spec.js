import { test, expect } from '@playwright/test';

async function crearSetViaAPI(page, { juegoId, nombre }) {
  await page.evaluate(async ({ juegoId, nombre }) => {
    await window.cumpeo.services.set.crearSet({
      juego_id: juegoId,
      nombre
    });
  }, { juegoId, nombre });
}

test('navegar de dashboard a lista de sets', async ({ page }) => {
  await page.goto('/');
  await page.click('a[href="#/sets"]');
  await expect(page.getByText('Sets', { exact: true }).first()).toBeVisible();
});

test('lista de sets sin filtro muestra mensaje', async ({ page }) => {
  await page.goto('/#/sets');
  await expect(page.getByText('Seleccioná un juego para ver sus sets.')).toBeVisible();
});

test('crear set', async ({ page }) => {
  await page.goto('/');
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await page.goto(`/#/sets?juego=${triviaId}`);
  await expect(page.locator('#filtro-juego')).toHaveValue(triviaId);
  await page.click('a[href*="#/sets/nuevo"]');
  await page.fill('#nombre', 'Cultura General');

  await Promise.all([
    page.waitForURL(/#\/sets\?juego=/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Cultura General')).toBeVisible({ timeout: 10000 });
});

test('editar set', async ({ page }) => {
  await page.goto('/');
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: 'Original' });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await expect(page.getByText('Original')).toBeVisible();

  await page.click('a:has-text("Editar")');
  await page.waitForURL(/#\/sets\/.+/);
  await page.fill('#nombre', 'Modificado');

  await Promise.all([
    page.waitForURL(/#\/sets\?juego=/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Modificado')).toBeVisible({ timeout: 10000 });
});

test('desactivar set', async ({ page }) => {
  await page.goto('/');
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: 'Para desactivar' });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await expect(page.getByText('Para desactivar')).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.click('button[data-desactivar]');
  await expect(page.getByText('Inactivo')).toBeVisible({ timeout: 10000 });
});

test('eliminar set', async ({ page }) => {
  await page.goto('/');
  const triviaId = await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    return juegos.find((j) => j.codigo === 'TRIVIA')?.id;
  });

  await crearSetViaAPI(page, { juegoId: triviaId, nombre: 'Para borrar' });
  await page.goto(`/#/sets?juego=${triviaId}`);
  await expect(page.getByText('Para borrar')).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.click('button[data-eliminar]');
  await expect(page.getByText('Para borrar')).not.toBeVisible({ timeout: 10000 });
});
