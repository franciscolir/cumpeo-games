import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderConfigJuego } from '../../../../src/ui/juegos/config.js';

const CODIGO_PIC = 'PICTIONARY';
const CODIGO_HISTORIA = 'HISTORIA_ENREDADA';

function crearElem() {
  const clases = new Set();
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    href: '',
    listeners: {},
    classList: {
      add: (c) => { clases.add(c); },
      remove: (c) => { clases.delete(c); },
      contains: (c) => clases.has(c),
      toggle: (c, force) => { if (force) clases.add(c); else clases.delete(c); }
    },
    addEventListener(ev, fn) { this.listeners[ev] = fn; },
    setAttribute(k, v) { this[k] = v; },
    click() { return this.listeners.click?.(); },
    focus() {}
  };
}

function crearContainer() {
  const elems = new Map();
  return {
    innerHTML: '',
    querySelector(sel) {
      if (!elems.has(sel)) elems.set(sel, crearElem());
      return elems.get(sel);
    }
  };
}

function crearApp({ juego = null, config = {} } = {}) {
  return {
    services: {
      juego: {
        obtenerJuegoPorCodigo: vi.fn().mockResolvedValue(juego),
        obtenerConfiguracion: vi.fn().mockResolvedValue(config),
        actualizarConfiguracion: vi.fn().mockResolvedValue({})
      }
    }
  };
}

function juegoPic(overrides = {}) {
  return { id: 'j-pic', codigo: 'PICTIONARY', nombre: 'Pictionary', configuracion: {}, ...overrides };
}

function juegoTrivia() {
  return { id: 'j-trivia', codigo: 'TRIVIA', nombre: 'Trivia', configuracion: {} };
}

function juegoHistoria(overrides = {}) {
  return { id: 'j-he', codigo: 'HISTORIA_ENREDADA', nombre: 'Historia Enredada', configuracion: {}, ...overrides };
}

async function agregar(container, banco, texto) {
  container.querySelector(`#input-nueva-${banco}`).value = texto;
  await container.querySelector(`#btn-agregar-${banco}`).click();
}

async function agregarColor(container, color, pregunta) {
  container.querySelector('#input-nuevo-color').value = color;
  container.querySelector('#input-nueva-pregunta').value = pregunta;
  await container.querySelector('#btn-agregar-color').click();
}

async function enterEn(input, container) {
  const el = container.querySelector(input);
  el.listeners.keydown?.({ key: 'Enter' });
}

async function guardar(container) {
  await container.querySelector('#btn-guardar-config').click();
}

describe('renderConfigJuego', () => {
  let container;

  beforeEach(() => {
    container = crearContainer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('render — código inexistente / 404', () => {
    it('es una función exportada', () => {
      expect(typeof renderConfigJuego).toBe('function');
    });

    it('código inexistente → 404 con Header volverA #/', async () => {
      const app = crearApp({ juego: null });
      await renderConfigJuego(container, app, { codigo: 'NO_EXISTE' });
      expect(container.innerHTML).toContain('Juego no encontrado.');
      expect(container.innerHTML).toContain('href="#/"');
      expect(app.services.juego.obtenerJuegoPorCodigo).toHaveBeenCalledWith('NO_EXISTE');
      expect(app.services.juego.obtenerConfiguracion).not.toHaveBeenCalled();
    });

    it('params.codigo vacío → 404 sin llamar servicio', async () => {
      const app = crearApp();
      await renderConfigJuego(container, app, {});
      expect(container.innerHTML).toContain('Juego no encontrado.');
      expect(app.services.juego.obtenerJuegoPorCodigo).not.toHaveBeenCalled();
    });
  });

  describe('render — placeholder para otros juegos', () => {
    it('código distinto de PICTIONARY → placeholder', async () => {
      const app = crearApp({ juego: juegoTrivia() });
      await renderConfigJuego(container, app, { codigo: 'TRIVIA' });
      expect(container.innerHTML).toContain('Configuración pendiente para este juego.');
      expect(container.innerHTML).toContain('Configuración — Trivia');
      expect(app.services.juego.obtenerConfiguracion).not.toHaveBeenCalled();
      expect(container.querySelector('#lista-gestos')).toBeDefined();
      expect(app.services.juego.actualizarConfiguracion).not.toHaveBeenCalled();
    });

    it('placeholder no muestra bancos', async () => {
      const app = crearApp({ juego: juegoTrivia() });
      await renderConfigJuego(container, app, { codigo: 'TRIVIA' });
      expect(container.innerHTML).not.toContain('id="banco-gestos"');
      expect(container.innerHTML).not.toContain('id="banco-dibujo"');
      expect(container.innerHTML).not.toContain('id="btn-guardar-config"');
    });

    it('placeholder cancela hacia sets del juego', async () => {
      const app = crearApp({ juego: juegoTrivia() });
      await renderConfigJuego(container, app, { codigo: 'TRIVIA' });
      expect(container.innerHTML).toContain('href="#/sets?juego=j-trivia"');
    });
  });

  describe('render — PICTIONARY', () => {
    it('renderiza 2 listas, inputs y botones', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });

      expect(container.innerHTML).toContain('id="lista-gestos"');
      expect(container.innerHTML).toContain('id="lista-dibujo"');
      expect(container.innerHTML).toContain('id="input-nueva-gestos"');
      expect(container.innerHTML).toContain('id="input-nueva-dibujo"');
      expect(container.innerHTML).toContain('id="btn-agregar-gestos"');
      expect(container.innerHTML).toContain('id="btn-agregar-dibujo"');
      expect(container.innerHTML).toContain('id="btn-guardar-config"');
      expect(container.innerHTML).toContain('id="config-error"');
      expect(container.innerHTML).toContain('id="config-ok"');
    });

    it('muestra títulos de bancos', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.innerHTML).toContain('Condiciones para GESTOS');
      expect(container.innerHTML).toContain('Condiciones para DIBUJO');
      expect(container.innerHTML).toContain('Bancos de condiciones');
      expect(container.innerHTML).toContain('Configuración — Pictionary');
    });

    it('Header volverA apunta a sets del juego', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.innerHTML).toContain('href="#/sets?juego=j-pic"');
    });

    it('el enlace Cancelar apunta a #/sets?juego=...', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.innerHTML).toContain('href="#/sets?juego=j-pic"');
    });

    it('error y ok nacen ocultos', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.innerHTML).toMatch(/id="config-error"[^>]*class="[^"]*hidden/);
      expect(container.innerHTML).toMatch(/id="config-ok"[^>]*class="[^"]*hidden/);
    });
  });

  describe('carga de configuración', () => {
    it('config vacía → listas vacías con mensaje', async () => {
      const app = crearApp({ juego: juegoPic(), config: {} });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });

      expect(app.services.juego.obtenerConfiguracion).toHaveBeenCalledWith('j-pic');
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual([]);
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual([]);
      expect(container.querySelector('#lista-gestos').innerHTML).toContain('Sin condiciones todavía');
      expect(container.querySelector('#lista-dibujo').innerHTML).toContain('Sin condiciones todavía');
    });

    it('config con condiciones → lista poblada', async () => {
      const app = crearApp({
        juego: juegoPic(),
        config: {
          condiciones_gestos: ['Solo manos', 'Solo cara'],
          condiciones_dibujo: ['Ojos cerrados']
        }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['Solo manos', 'Solo cara']);
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['Ojos cerrados']);
      expect(container.querySelector('#lista-gestos').innerHTML).toContain('Solo manos');
      expect(container.querySelector('#lista-gestos').innerHTML).toContain('Solo cara');
      expect(container.querySelector('#lista-dibujo').innerHTML).toContain('Ojos cerrados');
    });

    it('config sin arrays → defaults vacíos', async () => {
      const app = crearApp({ juego: juegoPic(), config: { otra_clave: 1 } });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual([]);
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual([]);
    });

    it('guarda juegoId en el estado', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      expect(container.__configJuegoEstado.juegoId).toBe('j-pic');
    });
  });

  describe('agregar condiciones', () => {
    it('agregar condición de gestos → aparece en la lista', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', 'De espaldas');

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['De espaldas']);
      expect(container.querySelector('#lista-gestos').innerHTML).toContain('De espaldas');
      expect(container.querySelector('#input-nueva-gestos').value).toBe('');
    });

    it('agregar condición de dibujo → aparece en la lista', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'dibujo', 'Mano contraria');

      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['Mano contraria']);
      expect(container.querySelector('#lista-dibujo').innerHTML).toContain('Mano contraria');
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual([]);
    });

    it('agregar no duplica bancos entre sí', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', 'Mismo texto');
      await agregar(container, 'dibujo', 'Mismo texto');

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['Mismo texto']);
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['Mismo texto']);
    });

    it('NO agrega strings vacíos', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', '   ');

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual([]);
      expect(container.querySelector('#config-error').textContent).toBe('La condición no puede estar vacía');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(false);
    });

    it('NO agrega duplicados dentro del mismo banco', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', 'Solo manos');
      await agregar(container, 'gestos', 'Solo manos');

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['Solo manos']);
      expect(container.querySelector('#config-error').textContent)
        .toBe('La condición "Solo manos" ya existe en este banco');
    });

    it('duplicado en dibujo no afecta a gestos', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'dibujo', 'X');
      await agregar(container, 'dibujo', 'X');
      await agregar(container, 'gestos', 'X');

      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['X']);
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['X']);
    });

    it('recorta whitespace al agregar', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', '  Solo manos  ');

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['Solo manos']);
    });

    it('agregar tras error limpia el error', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', '');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(false);

      await agregar(container, 'gestos', 'Válida');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(true);
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['Válida']);
    });
  });

  describe('eliminar condiciones', () => {
    it('eliminar condición → se quita de la lista', async () => {
      const app = crearApp({
        juego: juegoPic(),
        config: { condiciones_gestos: ['A', 'B'], condiciones_dibujo: ['C'] }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });

      await container.querySelector('[data-quitar-gestos="0"]').click();

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['B']);
      expect(container.querySelector('#lista-gestos').innerHTML).not.toContain('>A<');
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['C']);
    });

    it('eliminar la última condición muestra "Sin condiciones todavía"', async () => {
      const app = crearApp({
        juego: juegoPic(),
        config: { condiciones_gestos: ['Única'] }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await container.querySelector('[data-quitar-gestos="0"]').click();

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual([]);
      expect(container.querySelector('#lista-gestos').innerHTML).toContain('Sin condiciones todavía');
    });

    it('eliminar de dibujo no toca gestos', async () => {
      const app = crearApp({
        juego: juegoPic(),
        config: { condiciones_gestos: ['G'], condiciones_dibujo: ['D1', 'D2'] }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await container.querySelector('[data-quitar-dibujo="0"]').click();

      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['G']);
      expect(container.__configJuegoEstado.condiciones_dibujo).toEqual(['D2']);
    });
  });

  describe('guardar configuración', () => {
    it('guardar config → llama actualizarConfiguracion con el objeto correcto', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', 'Solo manos');
      await agregar(container, 'dibujo', 'Ojos cerrados');
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-pic', {
        condiciones_gestos: ['Solo manos'],
        condiciones_dibujo: ['Ojos cerrados']
      });
    });

    it('guardar sin cambios → llama igual (idempotente)', async () => {
      const app = crearApp({ juego: juegoPic(), config: { condiciones_gestos: ['A'] } });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledTimes(1);
      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-pic', {
        condiciones_gestos: ['A'],
        condiciones_dibujo: []
      });
    });

    it('éxito al guardar → muestra #config-ok', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await guardar(container);

      const ok = container.querySelector('#config-ok');
      expect(ok.textContent).toBe('Configuración guardada');
      expect(ok.classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(true);
    });

    it('error al guardar → muestra #config-error', async () => {
      const app = crearApp({ juego: juegoPic() });
      app.services.juego.actualizarConfiguracion.mockRejectedValue(new Error('fallo guardado'));
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await guardar(container);

      const err = container.querySelector('#config-error');
      expect(err.textContent).toBe('fallo guardado');
      expect(err.classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#config-ok').classList.contains('hidden')).toBe(true);
    });

    it('guardar con bancos vacíos → envía arrays vacíos', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-pic', {
        condiciones_gestos: [],
        condiciones_dibujo: []
      });
    });

    it('el payload es una copia (no referencia al estado)', async () => {
      const app = crearApp({ juego: juegoPic() });
      await renderConfigJuego(container, app, { codigo: CODIGO_PIC });
      await agregar(container, 'gestos', 'X');
      await guardar(container);

      const payload = app.services.juego.actualizarConfiguracion.mock.calls[0][1];
      payload.condiciones_gestos.push('HACK');
      expect(container.__configJuegoEstado.condiciones_gestos).toEqual(['X']);
    });
  });

  describe('render — HISTORIA_ENREDADA', () => {
    it('renderiza 2 inputs, botón y lista de colores', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });

      expect(container.innerHTML).toContain('id="lista-colores"');
      expect(container.innerHTML).toContain('id="input-nuevo-color"');
      expect(container.innerHTML).toContain('id="input-nueva-pregunta"');
      expect(container.innerHTML).toContain('id="btn-agregar-color"');
      expect(container.innerHTML).toContain('id="btn-guardar-config"');
      expect(container.innerHTML).toContain('id="config-error"');
      expect(container.innerHTML).toContain('id="config-ok"');
    });

    it('muestra títulos de colores', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.innerHTML).toContain('Colores y consignas');
      expect(container.innerHTML).toContain('Configuración — Historia Enredada');
    });

    it('Header y Cancelar apuntan a sets del juego', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.innerHTML).toContain('href="#/sets?juego=j-he"');
    });

    it('error y ok nacen ocultos', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.innerHTML).toMatch(/id="config-error"[^>]*class="[^"]*hidden/);
      expect(container.innerHTML).toMatch(/id="config-ok"[^>]*class="[^"]*hidden/);
    });

    it('no muestra bancos de Pictionary', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.innerHTML).not.toContain('id="banco-gestos"');
      expect(container.innerHTML).not.toContain('id="lista-gestos"');
      expect(container.innerHTML).not.toContain('id="input-nueva-gestos"');
    });

    it('config vacía → lista vacía con mensaje', async () => {
      const app = crearApp({ juego: juegoHistoria(), config: {} });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });

      expect(app.services.juego.obtenerConfiguracion).toHaveBeenCalledWith('j-he');
      expect(container.__configJuegoEstado.colores).toEqual([]);
      expect(container.querySelector('#lista-colores').innerHTML).toContain('Sin colores todavía');
    });

    it('config con colores → lista poblada', async () => {
      const app = crearApp({
        juego: juegoHistoria(),
        config: {
          colores: [
            { color: 'AZUL', pregunta: 'Nombre de alguien presente' },
            { color: 'ROJO', pregunta: 'Algún sobrenombre' }
          ]
        }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'AZUL', pregunta: 'Nombre de alguien presente' },
        { color: 'ROJO', pregunta: 'Algún sobrenombre' }
      ]);
      expect(container.querySelector('#lista-colores').innerHTML).toContain('AZUL');
      expect(container.querySelector('#lista-colores').innerHTML).toContain('ROJO');
    });

    it('config sin colores → defaults vacíos', async () => {
      const app = crearApp({ juego: juegoHistoria(), config: { otra: 1 } });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.__configJuegoEstado.colores).toEqual([]);
    });

    it('guarda juegoId en el estado', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      expect(container.__configJuegoEstado.juegoId).toBe('j-he');
    });

    it('agregar color → aparece en la lista', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'Nombre de alguien');

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'AZUL', pregunta: 'Nombre de alguien' }
      ]);
      expect(container.querySelector('#lista-colores').innerHTML).toContain('AZUL');
      expect(container.querySelector('#lista-colores').innerHTML).toContain('Nombre de alguien');
    });

    it('NO agrega si color vacío', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, '  ', 'Pregunta válida');

      expect(container.__configJuegoEstado.colores).toEqual([]);
      expect(container.querySelector('#config-error').textContent).toBe('El color no puede estar vacío');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(false);
    });

    it('NO agrega si pregunta vacía', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', '   ');

      expect(container.__configJuegoEstado.colores).toEqual([]);
      expect(container.querySelector('#config-error').textContent).toBe('La pregunta no puede estar vacía');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(false);
    });

    it('NO agrega color duplicado', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'Primera');
      await agregarColor(container, 'AZUL', 'Segunda');

      expect(container.__configJuegoEstado.colores).toHaveLength(1);
      expect(container.__configJuegoEstado.colores[0].pregunta).toBe('Primera');
      expect(container.querySelector('#config-error').textContent).toBe('El color "AZUL" ya existe');
    });

    it('duplicado es case-sensitive', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'Uno');
      await agregarColor(container, 'azul', 'Dos');

      expect(container.__configJuegoEstado.colores).toHaveLength(2);
    });

    it('recorta whitespace al agregar', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, '  VERDE  ', '  Pregunta  ');

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'VERDE', pregunta: 'Pregunta' }
      ]);
    });

    it('tras agregar, los inputs quedan vacíos', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'Pregunta');

      expect(container.querySelector('#input-nuevo-color').value).toBe('');
      expect(container.querySelector('#input-nueva-pregunta').value).toBe('');
    });

    it('agregar tras error limpia el error', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, '', '');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(false);

      await agregarColor(container, 'AZUL', 'Válida');
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(true);
      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'AZUL', pregunta: 'Válida' }
      ]);
    });

    it('eliminar color → se quita de la lista', async () => {
      const app = crearApp({
        juego: juegoHistoria(),
        config: {
          colores: [
            { color: 'AZUL', pregunta: 'A' },
            { color: 'ROJO', pregunta: 'B' }
          ]
        }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });

      await container.querySelector('[data-quitar-color="0"]').click();

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'ROJO', pregunta: 'B' }
      ]);
      expect(container.querySelector('#lista-colores').innerHTML).not.toContain('AZUL');
    });

    it('eliminar el último color muestra "Sin colores todavía"', async () => {
      const app = crearApp({
        juego: juegoHistoria(),
        config: { colores: [{ color: 'ÚNICO', pregunta: 'P' }] }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await container.querySelector('[data-quitar-color="0"]').click();

      expect(container.__configJuegoEstado.colores).toEqual([]);
      expect(container.querySelector('#lista-colores').innerHTML).toContain('Sin colores todavía');
    });

    it('guardar → llama actualizarConfiguracion con { colores: [...] }', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'Nombre');
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-he', {
        colores: [{ color: 'AZUL', pregunta: 'Nombre' }]
      });
    });

    it('guardar sin cambios → llama igual (idempotente)', async () => {
      const app = crearApp({
        juego: juegoHistoria(),
        config: { colores: [{ color: 'AZUL', pregunta: 'P' }] }
      });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledTimes(1);
      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-he', {
        colores: [{ color: 'AZUL', pregunta: 'P' }]
      });
    });

    it('guardar con lista vacía → envía colores: []', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await guardar(container);

      expect(app.services.juego.actualizarConfiguracion).toHaveBeenCalledWith('j-he', {
        colores: []
      });
    });

    it('éxito al guardar → muestra #config-ok', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await guardar(container);

      const ok = container.querySelector('#config-ok');
      expect(ok.textContent).toBe('Configuración guardada');
      expect(ok.classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#config-error').classList.contains('hidden')).toBe(true);
    });

    it('error al guardar → muestra #config-error', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      app.services.juego.actualizarConfiguracion.mockRejectedValue(new Error('fallo colores'));
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await guardar(container);

      const err = container.querySelector('#config-error');
      expect(err.textContent).toBe('fallo colores');
      expect(err.classList.contains('hidden')).toBe(false);
      expect(container.querySelector('#config-ok').classList.contains('hidden')).toBe(true);
    });

    it('el payload es una copia (no referencia al estado)', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      await agregarColor(container, 'AZUL', 'P');
      await guardar(container);

      const payload = app.services.juego.actualizarConfiguracion.mock.calls[0][1];
      payload.colores.push({ color: 'HACK', pregunta: 'HACK' });
      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'AZUL', pregunta: 'P' }
      ]);
    });

    it('Enter en input color agrega', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      container.querySelector('#input-nuevo-color').value = 'AZUL';
      container.querySelector('#input-nueva-pregunta').value = 'P';
      enterEn('#input-nuevo-color', container);

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'AZUL', pregunta: 'P' }
      ]);
    });

    it('Enter en input pregunta agrega', async () => {
      const app = crearApp({ juego: juegoHistoria() });
      await renderConfigJuego(container, app, { codigo: CODIGO_HISTORIA });
      container.querySelector('#input-nuevo-color').value = 'ROJO';
      container.querySelector('#input-nueva-pregunta').value = 'Q';
      enterEn('#input-nueva-pregunta', container);

      expect(container.__configJuegoEstado.colores).toEqual([
        { color: 'ROJO', pregunta: 'Q' }
      ]);
    });
  });
});
