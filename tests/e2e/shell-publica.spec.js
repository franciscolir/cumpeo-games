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
      nombre: `ShellPub ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `ShellPub ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `SP${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(partida.id);
    const equipoPartidaId = ctx.equipos[0]?.id || null;

    return { codigo: partida.public_codigo, partidaId: partida.id, equipoPartidaId };
  });
}

test('shell público carga en una partida existente', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('CUMPEO').first()).toBeVisible({ timeout: 15000 });
});

test('marcador muestra ambos equipos con colores correctos', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const team1Box = page.locator('.border-\\[\\#00D2FF\\]').first();
  const team2Box = page.locator('.border-\\[\\#FF3344\\]').first();
  await expect(team1Box).toBeVisible({ timeout: 15000 });
  await expect(team2Box).toBeVisible({ timeout: 15000 });
  await expect(team1Box.getByText('Rojo')).toBeVisible();
  await expect(team2Box.getByText('Azul')).toBeVisible();
});

test('PIN visible en header', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText(codigo).first()).toBeVisible({ timeout: 15000 });
});

test('no muestra botones de control', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const botonesControl = page.locator('button[data-accion]');
  await expect(botonesControl).toHaveCount(0);
});

test('galería muestra ESPERANDO FOTOS cuando no hay fotos', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const placeholder = page.locator('[data-role="galeria-placeholder"]');
  await expect(placeholder).toBeVisible({ timeout: 15000 });
  await expect(placeholder.getByText('ESPERANDO FOTOS...')).toBeVisible();
});

test('QR visible en pantalla', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const qrSection = page.locator('[data-role="qr-section"]');
  await expect(qrSection).toBeVisible({ timeout: 15000 });
  const qrCode = page.locator('[data-role="qr-code"]');
  await expect(qrCode).toBeVisible();
});

test('galería muestra foto cuando hay una aprobada', async ({ page }) => {
  await page.goto('/');
  const { codigo, partidaId, equipoPartidaId } = await setupPartidaCompleta(page);

  await page.evaluate(async ({ partidaId, equipoPartidaId }) => {
    const participante = await window.cumpeo.services.participante.crearParticipanteConToken({
      partidaId,
      equipoPartidaId,
      nombre: 'Test User',
      sessionToken: crypto.randomUUID()
    });

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 100, 100);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

    const foto = await window.cumpeo.services.foto.crearFoto({
      partidaId,
      participanteId: participante.id,
      blob,
      mimeType: 'image/png'
    });

    await window.cumpeo.services.foto.aprobarFoto(foto.id, window.cumpeo.session.sessionId);
  }, { partidaId, equipoPartidaId });

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  const img = page.locator('[data-role="galeria-img"]');
  await expect(img).toBeVisible({ timeout: 15000 });
  await expect(img).toHaveAttribute('src', /blob:|data:|supabase/);
});
