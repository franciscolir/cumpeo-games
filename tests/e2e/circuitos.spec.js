import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

test('navegar de dashboard a lista de circuitos', async ({ page }) => {
  await page.goto('/#/');
  await page.waitForSelector('a[href="#/circuitos"]');
  await page.click('a[href="#/circuitos"]');
  await expect(page.getByText('Circuitos', { exact: true }).first()).toBeVisible();
});

test('lista de circuitos muestra lista o empty state', async ({ page }) => {
  await page.goto('/#/circuitos');
  await waitForCumpeo(page);
  const heading = page.getByText('Circuitos', { exact: true });
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('crear circuito', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/#/circuitos/nuevo');
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await page.fill('#nombre', `Circ ${uid}`);
  await page.fill('#equipo_0_nombre', 'Rojo');
  await page.fill('#equipo_1_nombre', 'Azul');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Circ ${uid}`)).toBeVisible({ timeout: 10000 });
});

test('eliminar circuito', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  await page.goto('/#/circuitos/nuevo');
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await page.fill('#nombre', `Del ${uid}`);
  await page.fill('#equipo_0_nombre', 'A');
  await page.fill('#equipo_1_nombre', 'B');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Del ${uid}`)).toBeVisible({ timeout: 10000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator(`li:has-text("${uid}") button[data-eliminar]`).click();
  await expect(page.getByText(`Del ${uid}`)).not.toBeVisible({ timeout: 10000 });
});

test('editar circuito', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  await page.goto('/#/circuitos/nuevo');
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await page.fill('#nombre', `Edit ${uid}`);
  await page.fill('#equipo_0_nombre', 'A');
  await page.fill('#equipo_1_nombre', 'B');

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Edit ${uid}`)).toBeVisible({ timeout: 10000 });

  await page.locator(`li:has-text("${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/circuitos\/.+/);
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await page.fill('#nombre', `Mod ${uid}`);

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Mod ${uid}`)).toBeVisible({ timeout: 10000 });
});

test('router 404 para ruta desconocida', async ({ page }) => {
  await page.goto('/#/ruta-inexistente');
  await expect(page.getByText('404')).toBeVisible();
});
