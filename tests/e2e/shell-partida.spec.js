import { test, expect } from '@playwright/test';
import { loginTestUser, waitForCumpeo } from './_helpers/auth.js';

test.beforeEach(loginTestUser);

async function setupCircuitoYPartida(page) {
  await waitForCumpeo(page);
  return await page.evaluate(async () => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const trivia = juegos.find((j) => j.codigo === 'TRIVIA');

    const uid = Date.now().toString(36);
    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `Shell ${uid}`,
      juegos: [{ juego_id: trivia.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `Shell ${uid}`,
        juegos: [{ juego_id: trivia.id }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `SH${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id, codigo: partida.public_codigo };
  });
}

test('shell carga en una partida existente', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.locator('.font-display-hero').first()).toBeVisible({ timeout: 15000 });
});

test('marcador de ambos equipos visible', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.getByText('VS')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Rojo')).toBeVisible();
  await expect(page.getByText('Azul')).toBeVisible();
});

test('código público visible', async ({ page }) => {
  await page.goto('/');
  const { id, codigo } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.getByText(codigo)).toBeVisible({ timeout: 15000 });
});

test('botón "Ver pública" tiene target="_blank"', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btn = page.locator('a[href*="/publica/"]');
  await expect(btn).toBeVisible({ timeout: 15000 });
  await expect(btn).toHaveAttribute('target', '_blank');
});

test('Equipo 1 usa color comicBlue', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const team1Box = page.locator('.border-\\[\\#00D2FF\\]').first();
  await expect(team1Box).toBeVisible({ timeout: 15000 });
});

test('Equipo 2 usa color comicRed', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const team2Box = page.locator('.border-\\[\\#FF3344\\]').first();
  await expect(team2Box).toBeVisible({ timeout: 15000 });
});

test('Botón Pausar visible cuando juego EN_CURSO y tengo control', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btnPausar = page.locator('#btn-pausar');
  await expect(btnPausar).toBeVisible({ timeout: 15000 });
});

test('shell del conductor renderiza TriviaGameUI', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  const tieneTrivia = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.existe('TRIVIA');
  });
  expect(tieneTrivia).toBe(true);

  const gameUICount = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.cantidad();
  });
  expect(gameUICount).toBeGreaterThanOrEqual(1);
});

test('botón Tomar control visible si no tengo control', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btnTomarControl = page.locator('#btn-tomar-control');
  await expect(btnTomarControl).toBeVisible({ timeout: 15000 });
});

test('botón Comenzar visible si tengo control y estado CONFIGURANDO', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
  }, id);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btnComenzar = page.locator('#btn-comenzar');
  await expect(btnComenzar).toBeVisible({ timeout: 15000 });
});

test('botón Descartar visible si tengo control y estado EN_CURSO', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
  }, id);
  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const btnDescartar = page.locator('#btn-descartar');
  await expect(btnDescartar).toBeVisible({ timeout: 15000 });
});

test('cola de moderación visible si tengo control', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
  }, id);
  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const cola = page.locator('#cola-moderacion');
  await expect(cola).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Moderación')).toBeVisible();
  await expect(page.locator('#lista-mensajes-pendientes')).toBeVisible();
  await expect(page.locator('#lista-fotos-pendientes')).toBeVisible();
});

test('cola de moderación NO visible si no tengo control', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  const cola = page.locator('#cola-moderacion');
  await expect(cola).toHaveCount(0);
});

test('cola muestra Sin pendientes si no hay nada', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());
  }, id);
  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);
  await expect(page.locator('#cola-moderacion')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Sin mensajes pendientes')).toBeVisible();
  await expect(page.getByText('Sin fotos pendientes')).toBeVisible();
});

test('cambiar-estado-juego actualiza el estado del juego', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  const stateVersionAntes = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0].state_version;
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await expect(page.locator('#btn-pausar')).toBeVisible({ timeout: 15000 });

  await page.evaluate(async () => {
    await window.__shellPartidaCallbacks.onAccion('cambiar-estado-juego', {
      estadoJuego: { foo: 'bar', ronda: 1 }
    });
  });

  await page.waitForTimeout(1000);

  const resultado = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const j = ctx.juegos[0];
    return { state_version: j.state_version, estado_juego: j.estado_juego, estado: j.estado };
  }, id);

  expect(resultado.state_version).toBeGreaterThan(stateVersionAntes);
  expect(resultado.estado_juego.foo).toBe('bar');
  expect(resultado.estado_juego.ronda).toBe(1);
  expect(resultado.estado).toBe('EN_CURSO');
});

test('onAccion sin control no ejecuta acción', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await expect(page.locator('#btn-tomar-control')).toBeVisible({ timeout: 15000 });

  await page.evaluate(async () => {
    await window.__shellPartidaCallbacks.onAccion('cambiar-estado-juego', {
      estadoJuego: { shouldNot: 'persist' }
    });
  });

  await page.waitForTimeout(500);

  await expect(page.locator('#btn-tomar-control')).toBeVisible();
});

test('uiRegistry tiene QuePiensaElPublicoGameUI registrado', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoYPartida(page);
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  const tieneQPEP = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.existe('QUE_PIENSA_EL_PUBLICO');
  });
  expect(tieneQPEP).toBe(true);

  const gameUICount = await page.evaluate(() => {
    return window.cumpeo.uiRegistry.cantidad();
  });
  expect(gameUICount).toBe(2);

  const qpepUI = await page.evaluate(() => {
    const ui = window.cumpeo.uiRegistry.obtener('QUE_PIENSA_EL_PUBLICO');
    return {
      tieneRenderizarArea: typeof ui.renderizarAreaJuego === 'function',
      tieneRenderizarPanel: typeof ui.renderizarPanelConductor === 'function'
    };
  });
  expect(qpepUI.tieneRenderizarArea).toBe(true);
  expect(qpepUI.tieneRenderizarPanel).toBe(true);
});

async function setupCircuitoQPEP(page) {
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
      juegos: [{ juego_id: qpep.id }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `QPEP Circuit ${uid}`,
        juegos: [{ juego_id: qpep.id }],
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

test('flujo QPEP: iniciar juego → iniciar encuesta → cerrar encuesta', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await expect(page.locator('#btn-pausar')).toBeVisible({ timeout: 15000 });

  const btnIniciarJuego = page.locator('#btn-qpep-iniciar-juego');
  await expect(btnIniciarJuego).toBeVisible({ timeout: 10000 });
  await btnIniciarJuego.click();

  await page.waitForTimeout(500);

  let faseActual = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0]?.estado_juego?.fase;
  }, id);
  expect(faseActual).toBe('SELECCIONANDO_PREGUNTA');

  await expect(page.locator('#btn-qpep-iniciar')).toBeVisible({ timeout: 10000 });
  await page.locator('#btn-qpep-iniciar').click();

  await page.waitForTimeout(500);

  faseActual = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0]?.estado_juego?.fase;
  }, id);
  expect(faseActual).toBe('ENCUESTA_ACTIVA');

  await expect(page.locator('#btn-qpep-cerrar')).toBeVisible({ timeout: 10000 });
  await page.locator('#btn-qpep-cerrar').click();

  await page.waitForTimeout(500);

  const estadoFinal = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const je = ctx.juegos[0];
    return {
      fase: je?.estado_juego?.fase,
      resultado: je?.estado_juego?.resultado_publico
    };
  }, id);
  expect(estadoFinal.fase).toBe('ENCUESTA_CERRADA');
  expect(estadoFinal.resultado).toBe('EMPATE');
});

async function setupCircuitoQPEPTimer(page, tiempoSeg) {
  await waitForCumpeo(page);
  return await page.evaluate(async (tiempoSeg) => {
    const juegos = await window.cumpeo.services.juego.listarJuegos();
    const qpep = juegos.find((j) => j.codigo === 'QUE_PIENSA_EL_PUBLICO');

    const uid = Date.now().toString(36);
    const set = await window.cumpeo.services.set.crearSet({
      juego_id: qpep.id,
      nombre: `QPEP Timer ${uid}`
    });

    await window.cumpeo.services.set.agregarItem(set.id, {
      pregunta: '¿Rapido o lento?',
      opcion_a: 'Rapido',
      opcion_b: 'Lento',
      tiempo_seg: tiempoSeg
    });

    const circuito = await window.cumpeo.services.circuito.crearCircuito({
      nombre: `QPEP Timer Circuit ${uid}`,
      juegos: [{ juego_id: qpep.id, configuracion: { tiempo_por_pregunta_seg: tiempoSeg } }],
      equipos: [
        { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
        { posicion: 2, nombre: 'Azul', color: '#3182CE' }
      ]
    });

    await window.cumpeo.services.circuito.actualizarCircuito(
      circuito.id, circuito.version,
      {
        nombre: `QPEP Timer Circuit ${uid}`,
        juegos: [{ juego_id: qpep.id, configuracion: { tiempo_por_pregunta_seg: tiempoSeg } }],
        equipos: [
          { posicion: 1, nombre: 'Rojo', color: '#E53E3E' },
          { posicion: 2, nombre: 'Azul', color: '#3182CE' }
        ],
        estado: 'LISTO'
      }
    );

    const codigo = `QT${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const partida = await window.cumpeo.services.partida.crearPartida(
      { circuito_id: circuito.id, public_codigo: codigo },
      crypto.randomUUID()
    );

    return { id: partida.id, codigo: partida.public_codigo };
  }, tiempoSeg);
}

test('timer de encuesta se inicia y auto-cierra', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoQPEPTimer(page, 2);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await expect(page.locator('#btn-pausar')).toBeVisible({ timeout: 15000 });

  await page.locator('#btn-qpep-iniciar-juego').click();
  await page.waitForTimeout(500);

  await page.locator('#btn-qpep-iniciar').click();
  await page.waitForTimeout(1000);

  const timerLocator = page.locator('#qpep-timer');
  await expect(timerLocator).toBeVisible({ timeout: 5000 });

  const textoInicial = await timerLocator.textContent();
  expect(textoInicial).toMatch(/^\d+s$/);

  await page.waitForTimeout(3000);

  const faseFinal = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0]?.estado_juego?.fase;
  }, id);
  expect(faseFinal).toBe('ENCUESTA_CERRADA');
});

test('conductor registra pronóstico equipo 1 y equipo 2', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await page.locator('#btn-qpep-iniciar-juego').click();
  await page.waitForTimeout(500);
  await page.locator('#btn-qpep-iniciar').click();
  await page.waitForTimeout(500);
  await page.locator('#btn-qpep-cerrar').click();
  await page.waitForTimeout(500);

  const btnEq1A = page.locator('[data-team="1"][data-valor="A"]');
  await expect(btnEq1A).toBeVisible({ timeout: 10000 });
  await btnEq1A.click();
  await expect(btnEq1A).toHaveClass(/bg-tertiary/, { timeout: 10000 });

  let pron1 = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0]?.estado_juego?.pronostico_equipo_1;
  }, id);
  expect(pron1).toBe('A');

  const btnEq2EMPATE = page.locator('[data-team="2"][data-valor="EMPATE"]');
  await expect(btnEq2EMPATE).toBeVisible();
  await btnEq2EMPATE.click();
  await expect(page.locator('[data-team="2"][data-valor="EMPATE"]')).toHaveClass(/bg-tertiary/, { timeout: 10000 });

  const estado = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return {
      pron1: ctx.juegos[0]?.estado_juego?.pronostico_equipo_1,
      pron2: ctx.juegos[0]?.estado_juego?.pronostico_equipo_2
    };
  }, id);
  expect(estado.pron1).toBe('A');
  expect(estado.pron2).toBe('EMPATE');
});

test('botón Revelar se habilita cuando ambos pronósticos están registrados', async ({ page }) => {
  await page.goto('/');
  const { id } = await setupCircuitoQPEP(page);

  await page.evaluate(async (pid) => {
    await window.cumpeo.services.partida.tomarControl(pid, window.cumpeo.session.sessionId);
    await window.cumpeo.services.partida.comenzarPartida(pid, window.cumpeo.session.sessionId, crypto.randomUUID());

    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    const cj = ctx.juegos[0];
    await window.cumpeo.services.partida.iniciarJuego(
      pid, cj.id, window.cumpeo.session.sessionId, crypto.randomUUID()
    );
  }, id);

  await page.goto('/');
  await page.goto(`/#/partidas/${id}`);
  await waitForCumpeo(page);

  await page.locator('#btn-qpep-iniciar-juego').click();
  await page.waitForTimeout(500);
  await page.locator('#btn-qpep-iniciar').click();
  await page.waitForTimeout(500);
  await page.locator('#btn-qpep-cerrar').click();
  await page.waitForTimeout(500);

  const btnRevelar = page.locator('#btn-qpep-revelar');
  await expect(btnRevelar).toBeVisible({ timeout: 10000 });
  await expect(btnRevelar).toBeDisabled();

  await page.locator('[data-team="1"][data-valor="B"]').click();
  await expect(page.locator('[data-team="1"][data-valor="B"]')).toHaveClass(/bg-tertiary/, { timeout: 10000 });
  await expect(btnRevelar).toBeDisabled();

  await page.locator('[data-team="2"][data-valor="A"]').click();
  await expect(btnRevelar).toBeEnabled({ timeout: 10000 });

  await btnRevelar.click();
  await page.waitForTimeout(500);

  const fase = await page.evaluate(async (pid) => {
    const ctx = await window.cumpeo.services.partida.obtenerContextoEspera(pid);
    return ctx.juegos[0]?.estado_juego?.fase;
  }, id);
  expect(fase).toBe('REVELANDO');
});
