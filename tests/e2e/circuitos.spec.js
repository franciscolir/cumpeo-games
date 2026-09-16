import { test, expect } from '@playwright/test';

test('navegar de dashboard a lista de circuitos', async ({ page }) => {
  await page.goto('/#/');
  await page.waitForSelector('a[href="#/circuitos"]');
  await page.click('a[href="#/circuitos"]');
  await expect(page.getByText('Circuitos', { exact: true }).first()).toBeVisible();
});

test('lista de circuitos muestra empty state inicial', async ({ page }) => {
  await page.goto('/#/circuitos');
  await expect(page.getByText('No hay circuitos creados')).toBeVisible();
});

test('crear circuito', async ({ page }) => {
  await page.goto('/#/circuitos/nuevo');
  await page.fill('#nombre', 'Test Circuito');
  await page.fill('#equipo_0_nombre', 'Rojo');
  await page.fill('#equipo_1_nombre', 'Azul');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Test Circuito')).toBeVisible({ timeout: 10000 });
});

test('eliminar circuito', async ({ page }) => {
  await page.goto('/#/circuitos/nuevo');
  await page.fill('#nombre', 'Para borrar');
  await page.fill('#equipo_0_nombre', 'A');
  await page.fill('#equipo_1_nombre', 'B');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Para borrar')).toBeVisible({ timeout: 10000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.click('button[data-eliminar]');
  await expect(page.getByText('Para borrar')).not.toBeVisible({ timeout: 10000 });
});

test('editar circuito', async ({ page }) => {
  await page.goto('/#/circuitos/nuevo');
  await page.fill('#nombre', 'Original');
  await page.fill('#equipo_0_nombre', 'A');
  await page.fill('#equipo_1_nombre', 'B');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Original')).toBeVisible({ timeout: 10000 });

  await page.click('a:has-text("Editar")');
  await page.waitForURL(/#\/circuitos\/.+/);
  await page.fill('#nombre', 'Modificado');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText('Modificado')).toBeVisible({ timeout: 10000 });
});

test('router 404 para ruta desconocida', async ({ page }) => {
  await page.goto('/#/ruta-inexistente');
  await expect(page.getByText('404')).toBeVisible();
});
