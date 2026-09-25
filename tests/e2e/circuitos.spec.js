import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupCircuito(page, uid, estado) {
  await waitForCumpeo(page);
  return await page.evaluate(async ({ uid, estado }) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const payload = {
      nombre: `Circ ${uid}`,
      juegos: [{ juego_id: juegos[0].id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    };
    const circuito = await window.cumpeo.services.circuito.crearCircuito(payload);
    if (estado === 'LISTO') {
      await window.cumpeo.services.circuito.actualizarCircuito(
        circuito.id,
        circuito.version,
        { ...payload, estado: 'LISTO' }
      );
    }
    return circuito.id;
  }, { uid, estado });
}

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

test('crear circuito con 2 juegos', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/#/circuitos/nuevo');
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await page.fill('#nombre', `Circ ${uid}`);
  await page.fill('#equipo_0_nombre', 'Rojo');
  await page.fill('#equipo_1_nombre', 'Azul');

  await page.click('#btn-agregar-juego');
  await page.waitForSelector('#juego_1', { timeout: 10000 });
  await page.selectOption('#juego_0', { index: 0 });
  await page.selectOption('#juego_1', { index: 1 });

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Circ ${uid}`)).toBeVisible({ timeout: 10000 });

  await page.locator(`li:has-text("${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/circuitos\/.+/);
  await page.waitForSelector('#form-circuito', { timeout: 15000 });

  await expect(page.locator('#lista-juegos select')).toHaveCount(2);
  const valores = await page.locator('#lista-juegos select').evaluateAll(
    (els) => els.map((el) => el.value)
  );
  expect(valores[0]).not.toBe(valores[1]);
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

test('editar circuito: renombrar y agregar un juego', async ({ page }) => {
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

  await page.click('#btn-agregar-juego');
  await page.waitForSelector('#juego_1', { timeout: 10000 });
  await page.selectOption('#juego_1', { index: 1 });

  await Promise.all([
    page.waitForURL(/#\/circuitos$/),
    page.click('button[type="submit"]')
  ]);

  await expect(page.getByText(`Mod ${uid}`)).toBeVisible({ timeout: 10000 });

  await page.locator(`li:has-text("${uid}") a:has-text("Editar")`).click();
  await page.waitForURL(/#\/circuitos\/.+/);
  await page.waitForSelector('#form-circuito', { timeout: 15000 });
  await expect(page.locator('#lista-juegos select')).toHaveCount(2);
  await expect(page.locator('#nombre')).toHaveValue(`Mod ${uid}`);
});

test('Comenzar solo aparece si el circuito está LISTO', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  const id = await setupCircuito(page, uid, 'BORRADOR');

  await page.goto('/#/circuitos');
  await waitForCumpeo(page);
  const fila = page.locator(`li:has-text("${uid}")`);
  await expect(fila).toBeVisible({ timeout: 10000 });
  await expect(fila.locator('button[data-comenzar]')).toHaveCount(0);

  await page.evaluate(async (circuitoId) => {
    const svc = window.cumpeo.services.circuito;
    const comp = await svc.obtenerCircuitoCompleto(circuitoId);
    await svc.actualizarCircuito(comp.circuito.id, comp.circuito.version, {
      nombre: comp.circuito.nombre,
      juegos: comp.juegos.map((j) => ({ juego_id: j.juego_id })),
      equipos: comp.equipos.map((e) => ({
        posicion: e.posicion,
        nombre: e.nombre,
        color: e.color
      })),
      estado: 'LISTO'
    });
  }, id);

  await page.reload();
  await waitForCumpeo(page);
  await expect(fila).toBeVisible({ timeout: 10000 });
  await expect(fila.locator('button[data-comenzar]')).toBeVisible({ timeout: 10000 });
});

test('Comenzar crea una partida y navega a la consola', async ({ page }) => {
  const uid = Date.now().toString(36);
  await page.goto('/');
  await waitForCumpeo(page);
  await setupCircuito(page, uid, 'LISTO');

  await page.goto('/#/circuitos');
  await waitForCumpeo(page);
  const fila = page.locator(`li:has-text("${uid}")`);
  await expect(fila).toBeVisible({ timeout: 10000 });

  await Promise.all([
    page.waitForURL(/#\/partidas\/.+/, { timeout: 20000 }),
    fila.locator('button[data-comenzar]').click()
  ]);

  await expect(page.locator('.font-display-hero').first()).toBeVisible({ timeout: 15000 });
});

test('router 404 para ruta desconocida', async ({ page }) => {
  await page.goto('/#/ruta-inexistente');
  await expect(page.getByText('404')).toBeVisible();
});
