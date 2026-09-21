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

test('card próximo desafío visible con texto esperando o juego', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const card = page.locator('[data-role="next-challenge-card"]');
  await expect(card).toBeVisible({ timeout: 15000 });
  const titulo = page.locator('[data-role="next-challenge-title"]');
  await expect(titulo).toBeVisible();
  const texto = await titulo.textContent();
  expect(texto).toMatch(/ESPERANDO|JUEGO|ÚLTIMO/);
});

test('muro de mensajes visible en footer', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  const muro = page.locator('#muro-mensajes');
  await expect(muro).toBeVisible({ timeout: 15000 });
  const track = page.locator('#muro-mensajes .marquee-track');
  await expect(track).toBeVisible();
  const spans = track.locator('> span');
  const count = await spans.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test('muro muestra placeholder si no hay mensajes', async ({ page }) => {
  await page.goto('/');
  const { codigo } = await setupPartidaCompleta(page);
  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.getByText('¡Mandá tu mensaje desde el móvil!')).toBeVisible({ timeout: 15000 });
});

test('muro muestra mensaje aprobado', async ({ page }) => {
  await page.goto('/');
  const { codigo, partidaId, equipoPartidaId } = await setupPartidaCompleta(page);

  await page.evaluate(async ({ partidaId, equipoPartidaId }) => {
    const participante = await window.cumpeo.services.participante.crearParticipanteConToken({
      partidaId,
      equipoPartidaId,
      nombre: 'Fan Mensaje',
      sessionToken: crypto.randomUUID()
    });

    const msg = await window.cumpeo.services.mensaje.crearMensaje({
      partidaId,
      participanteId: participante.id,
      texto: '¡Hola a todos!'
    });

    await window.cumpeo.services.mensaje.aprobarMensaje(msg.id, window.cumpeo.session.sessionId);
  }, { partidaId, equipoPartidaId });

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.locator('#muro-mensajes')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('¡Hola a todos!').first()).toBeVisible();
});

test('muro trunca mensajes largos', async ({ page }) => {
  await page.goto('/');
  const { codigo, partidaId, equipoPartidaId } = await setupPartidaCompleta(page);

  await page.evaluate(async ({ partidaId, equipoPartidaId }) => {
    const participante = await window.cumpeo.services.participante.crearParticipanteConToken({
      partidaId,
      equipoPartidaId,
      nombre: 'Fan Largo',
      sessionToken: crypto.randomUUID()
    });

    const msg = await window.cumpeo.services.mensaje.crearMensaje({
      partidaId,
      participanteId: participante.id,
      texto: 'Este es un mensaje muy largo que tiene que ser truncado por el muro'
    });

    await window.cumpeo.services.mensaje.aprobarMensaje(msg.id, window.cumpeo.session.sessionId);
  }, { partidaId, equipoPartidaId });

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);
  await expect(page.locator('#muro-mensajes')).toBeVisible({ timeout: 15000 });
  const track = page.locator('#muro-mensajes .marquee-track');
  await expect(track).toBeVisible();
  const spans = track.locator('> span');
  const count = await spans.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const firstText = await spans.first().textContent();
  expect(firstText).toContain('...');
});

async function setupPartidaQPEP(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const qpep = juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: qpep.id,
      nombre: `QPEP Set ${uid}`
    });

    await window.cumpeo.services.set.agregarItem(set.id, {
      pregunta: '¿Pizza o empanadas?',
      opcion_a: 'Pizza',
      opcion_b: 'Empanadas'
    });

    await window.cumpeo.services.set.agregarItem(set.id, {
      pregunta: '¿PlayStation o Xbox?',
      opcion_a: 'PlayStation',
      opcion_b: 'Xbox'
    });

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `QPEP Circuit ${uid}`,
      juegos: [{ juego_id: qpep.id, configuracion: { rondas: 2, tiempo_por_pregunta_seg: 30, puntos_por_acierto: 10 } }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `QPEP Circuit ${uid}`,
        juegos: [{ juego_id: qpep.id, configuracion: { rondas: 2, tiempo_por_pregunta_seg: 30, puntos_por_acierto: 10 } }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `QP${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id, codigo: partida.public_codigo };
  });
}

test('pública muestra pregunta en ENCUESTA_ACTIVA', async ({ page }) => {
  await page.goto('/');
  const { id, codigo } = await setupPartidaQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, je.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );

    const ctx2 = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je2 = ctx2.juegos[0];
    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, je2.id,
      { ...je2.estado_juego, fase: 'ENCUESTA_ACTIVA' },
      je2.state_version,
      window.cumpeo.session.sessionId,
      crypto.randomUUID()
    );
  }, id);

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  await expect(page.getByText('¿Pizza o empanadas?')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Pizza', { exact: true })).toBeVisible();
  await expect(page.getByText('Empanadas', { exact: true })).toBeVisible();
});

test('pública oculta galería cuando hay juego activo', async ({ page }) => {
  await page.goto('/');
  const { id, codigo } = await setupPartidaQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  const galeria = page.locator('[data-role="galeria"]');
  await expect(galeria).toHaveCount(0, { timeout: 10000 });
});

test('pública muestra resultado en REVELANDO', async ({ page }) => {
  await page.goto('/');
  const { id, codigo } = await setupPartidaQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );

    await window.cumpeo.services.partida.actualizarEstadoJuego(
      pid, cj.id,
      {
        fase: 'REVELANDO',
        pregunta_actual_index: 0,
        ronda_actual: 1,
        pronostico_equipo_1: 'A',
        pronostico_equipo_2: 'A',
        resultado_publico: 'A',
        respuestas_publico: { a: 12, b: 5 },
        total_respuestas: 17,
        puntos_equipo_1: 10,
        puntos_equipo_2: 0
      },
      cj.state_version,
      window.cumpeo.session.sessionId,
      crypto.randomUUID()
    );
  }, id);

  await page.goto(`/#/publica-nueva/${codigo}`);
  await waitForCumpeo(page);

  await expect(page.getByText('Resultado del público')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('17 respuestas')).toBeVisible();
});
