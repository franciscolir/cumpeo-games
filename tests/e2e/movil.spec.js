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

async function identificarEnMovil(page, codigo, nombre) {
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await page.locator('#movil-nombre').fill(nombre);
  await page.locator('#movil-continuar').click();
}

test('móvil pide nombre la primera vez', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('¿Cómo te llamás?')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#movil-nombre')).toBeVisible();
  await expect(page.locator('#movil-continuar')).toBeVisible();
});

test('móvil muestra marcador de ambos equipos', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'TestUser');
  await expect(page.getByText('Marcador')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Rojo')).toBeVisible();
  await expect(page.getByText('Azul')).toBeVisible();
  await expect(page.locator('.font-comic-score').first()).toBeVisible();
});

test('móvil con código inválido muestra "no encontrada"', async ({ page }) => {
  await page.goto('/');
  await waitForCumpeo(page);
  await page.goto('/#/movil/INVALIDOCODIGO');
  await expect(page.getByText('Partida no encontrada')).toBeVisible({ timeout: 15000 });
});

test('móvil no muestra botones de control (AC-VISUAL-M-01)', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'TestUser');
  await expect(page.getByText('CUMPEO').first()).toBeVisible({ timeout: 15000 });
  const botonesControl = page.locator('button[data-accion]');
  await expect(botonesControl).toHaveCount(0);
  const btnTomarControl = page.locator('#btn-tomar-control');
  await expect(btnTomarControl).toHaveCount(0);
  const btnComenzar = page.locator('#btn-comenzar');
  await expect(btnComenzar).toHaveCount(0);
});

test('móvil no pide nombre si ya hay session_token', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'TokenUser');
  await expect(page.getByText('Hola, TokenUser')).toBeVisible({ timeout: 15000 });
  await page.goto(`/#/movil/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('Hola, TokenUser')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('¿Cómo te llamás?')).not.toBeVisible();
});

test('móvil guarda session_token en localStorage', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'StorageUser');
  await expect(page.getByText('Hola, StorageUser')).toBeVisible({ timeout: 15000 });
  const token = await page.evaluate((c) => localStorage.getItem(`cumpeo:session_token:${c}`), codigo);
  expect(token).toBeTruthy();
  expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('móvil muestra saludo con nombre del participante', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'Juan');
  await expect(page.getByText('Hola, Juan')).toBeVisible({ timeout: 15000 });
});

test('móvil muestra formulario de mensaje', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'TestUser');
  await expect(page.getByText('Enviá un mensaje')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#movil-mensaje')).toBeVisible();
  await expect(page.locator('#movil-enviar-mensaje')).toBeVisible();
});

test('móvil envía un mensaje', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'Mensajeador');
  await expect(page.locator('#movil-mensaje')).toBeVisible({ timeout: 15000 });
  await page.locator('#movil-mensaje').fill('Hola equipo!');
  await page.locator('#movil-enviar-mensaje').click();
  await expect(page.locator('#movil-mensaje')).toHaveValue('');
});

test('móvil muestra confirmación tras enviar', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'Confirmador');
  await expect(page.locator('#movil-mensaje')).toBeVisible({ timeout: 15000 });
  await page.locator('#movil-mensaje').fill('Mensaje de prueba');
  await page.locator('#movil-enviar-mensaje').click();
  await expect(page.getByText('Mensaje enviado. Esperando aprobación.')).toBeVisible({ timeout: 10000 });
});

test('móvil muestra formulario de foto', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'TestUser');
  await expect(page.getByText('Enviá una foto')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#movil-foto-input')).toBeAttached();
  await expect(page.locator('#movil-foto-elegir')).toBeVisible();
  await expect(page.locator('#movil-foto-enviar')).toBeVisible();
  await expect(page.locator('#movil-foto-enviar')).toBeDisabled();
});

test('móvil envía una foto', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'Fotografo');
  await expect(page.locator('#movil-foto-elegir')).toBeVisible({ timeout: 15000 });
  const buffer = Buffer.from('fake-image-bytes');
  await page.locator('#movil-foto-input').setInputFiles({
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer
  });
  await expect(page.locator('#movil-foto-enviar')).toBeEnabled();
  await page.locator('#movil-foto-enviar').click();
  await expect(page.locator('#movil-foto-enviar')).toBeDisabled();
});

test('móvil muestra confirmación tras enviar foto', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'FotoConfirmador');
  await expect(page.locator('#movil-foto-elegir')).toBeVisible({ timeout: 15000 });
  const buffer = Buffer.from('fake-image-bytes');
  await page.locator('#movil-foto-input').setInputFiles({
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer
  });
  await page.locator('#movil-foto-enviar').click();
  await expect(page.getByText('Foto enviada. Esperando aprobación.')).toBeVisible({ timeout: 10000 });
});

test('móvil muestra preview al elegir foto', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await identificarEnMovil(page, codigo, 'PreviewUser');
  await expect(page.locator('#movil-foto-elegir')).toBeVisible({ timeout: 15000 });
  const buffer = Buffer.from('fake-image-bytes');
  await page.locator('#movil-foto-input').setInputFiles({
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer
  });
  await expect(page.locator('#movil-foto-preview-container')).toBeVisible();
  await expect(page.locator('#movil-foto-preview')).toBeVisible();
});
