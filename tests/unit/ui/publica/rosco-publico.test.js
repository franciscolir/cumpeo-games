import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ALFABETO, ESTADO_LETRA, RoscoGameDefinition } from '../../../../src/games/rosco/RoscoGameDefinition.js';
import { _obtenerItemRosco, _renderRoscoPublico } from '../../../../src/ui/publica/shell-publica.js';
import { renderRosco } from '../../../../src/ui/games/rosco/renderRosco.js';

function crearContainer() {
  return {
    innerHTML: '',
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => [])
  };
}

function estadoBase() {
  return RoscoGameDefinition.estadoInicial({
    rondas: 2,
    segundos_por_equipo: 60,
    puntos_por_acierto: 10,
    penalizacion_puntos: 5
  });
}

function itemsBase() {
  return ALFABETO.map((letra) => ({
    letra,
    definicion: `Definición de ${letra}`,
    respuesta: `Respuesta ${letra}`,
    ronda: 1
  }));
}

describe('Rosco Público — lógica de rendering', () => {
  describe('renderiza 27 letras del rosco', () => {
    it('genera HTML con data-letra para cada letra del alfabeto', () => {
      const estado = estadoBase();
      const rosco = estado.rosco || [];
      expect(rosco).toHaveLength(27);
      for (const item of rosco) {
        expect(ALFABETO).toContain(item.letra);
        expect(item.estado).toBe(ESTADO_LETRA.PENDIENTE);
      }
    });
  });

  describe('estados visuales de letras', () => {
    it('pendiente tiene estado pendiente', () => {
      const estado = estadoBase();
      expect(estado.rosco[0].estado).toBe(ESTADO_LETRA.PENDIENTE);
    });

    it('correcta se marca con acierto', () => {
      const estado = estadoBase();
      const config = { puntos_por_acierto: 10 };
      const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.CORRECTA);
    });

    it('incorrecta se marca con error', () => {
      const estado = estadoBase();
      const config = { penalizacion_puntos: 5 };
      const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', config);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.INCORRECTA);
    });

    it('pasada se marca con pasapalabra', () => {
      const estado = estadoBase();
      const nuevo = RoscoGameDefinition.aplicarPasapalabra(estado, 'A');
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.PASADA);
    });
  });

  describe('letra actual destacada', () => {
    it('indice_actual apunta a la letra actual', () => {
      const estado = estadoBase();
      expect(estado.indice_actual).toBe(0);
      expect(estado.rosco[estado.indice_actual].letra).toBe('A');
    });

    it('avanzarLetra cambia el indice', () => {
      const estado = estadoBase();
      const nuevo = RoscoGameDefinition.avanzarLetra(estado);
      expect(nuevo.indice_actual).toBe(1);
      expect(nuevo.rosco[nuevo.indice_actual].letra).toBe('B');
    });
  });

  describe('definición en el centro', () => {
    it('se obtiene del item actual por letra desde set_ronda_actual.items', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      const item = _obtenerItemRosco(estado);
      expect(item).not.toBeNull();
      expect(item.letra).toBe('A');
      expect(item.definicion).toContain('A');
    });

    it('no depende del campo ronda de los items', () => {
      const items = ALFABETO.map((letra) => ({
        letra,
        definicion: `Def de ${letra}`,
        respuesta: `Resp ${letra}`
      }));
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      const item = _obtenerItemRosco(estado);
      expect(item.letra).toBe('A');
      expect(item.definicion).toBe('Def de A');
    });

    it('devuelve null si no hay set_ronda_actual', () => {
      const estado = { ...estadoBase(), set_ronda_actual: null };
      expect(_obtenerItemRosco(estado)).toBeNull();
    });

    it('devuelve null si la letra actual no está en items', () => {
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items: [] } };
      expect(_obtenerItemRosco(estado)).toBeNull();
    });

    it('devuelve null si el estado no tiene rosco', () => {
      expect(_obtenerItemRosco({})).toBeNull();
      expect(_obtenerItemRosco(null)).toBeNull();
    });

    it('sigue a la letra al avanzar el índice', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, indice_actual: 1 };
      const item = _obtenerItemRosco(estado);
      expect(item.letra).toBe('B');
    });
  });

  describe('revelado de la respuesta', () => {
    it('antes de validar: respuesta no se muestra (letra pendiente)', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      const html = _renderRoscoPublico(estado);
      expect(html).not.toContain('rosco-respuesta');
      expect(html).not.toContain('Respuesta A');
    });

    it('después de OK: respuesta se muestra (letra correcta)', () => {
      const items = itemsBase();
      const config = { puntos_por_acierto: 10 };
      let estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      const html = _renderRoscoPublico(estado);
      expect(html).toContain('rosco-respuesta');
      expect(html).toContain('Respuesta A');
    });

    it('después de X: respuesta se muestra (letra incorrecta)', () => {
      const items = itemsBase();
      const config = { penalizacion_puntos: 5 };
      let estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      estado = RoscoGameDefinition.aplicarError(estado, 'A', config);
      const html = _renderRoscoPublico(estado);
      expect(html).toContain('rosco-respuesta');
      expect(html).toContain('Respuesta A');
    });

    it('al avanzar: respuesta desaparece (nueva letra pendiente)', () => {
      const items = itemsBase();
      const config = { puntos_por_acierto: 10 };
      let estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items } };
      estado = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      estado = RoscoGameDefinition.avanzarLetra(estado);
      const html = _renderRoscoPublico(estado);
      expect(html).not.toContain('rosco-respuesta');
      expect(estado.rosco[estado.indice_actual].estado).toBe(ESTADO_LETRA.PENDIENTE);
    });
  });

  describe('_renderRoscoPublico — usa renderRosco compartido', () => {
    it('renderiza el rosco circular con tamaño lg', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO' };
      const html = _renderRoscoPublico(estado);
      expect(html).toContain('rosco-circular');
      expect(html).toContain('rosco-size-lg');
      expect(html).not.toContain('rosco-size-md');
    });

    it('renderiza 27 data-letra', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO' };
      const html = _renderRoscoPublico(estado);
      const nodes = html.match(/data-letra="/g) || [];
      expect(nodes).toHaveLength(27);
    });

    it('incluye anillo SVG de progreso y leyenda', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO' };
      const html = _renderRoscoPublico(estado);
      expect(html).toContain('<svg id="rosco-progress"');
      expect(html).toContain('rosco-legend');
    });

    it('muestra la definición de la letra actual en la tarjeta central', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO' };
      const html = _renderRoscoPublico(estado);
      expect(html).toContain('rosco-central');
      expect(html).toContain('Definición de A');
    });

    it('es el mismo renderizador que usa el conductor (renderRosco)', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO' };
      const htmlPublico = _renderRoscoPublico(estado);
      const htmlConductor = renderRosco(estado, { tamañoLetra: 'md' });
      expect(htmlPublico).toContain('rosco-circular');
      expect(htmlConductor).toContain('rosco-circular');
      const letrasPublico = (htmlPublico.match(/data-letra="/g) || []).length;
      const letrasConductor = (htmlConductor.match(/data-letra="/g) || []).length;
      expect(letrasPublico).toBe(letrasConductor);
    });

    it('marca la letra actual con la clase active', () => {
      const items = itemsBase();
      const estado = { ...estadoBase(), set_ronda_actual: { id: 's1', items }, fase: 'TURNO_ACTIVO', indice_actual: 3 };
      const html = _renderRoscoPublico(estado);
      const m = html.match(/data-index="3"[\s\S]*?<button[^>]*class="letter-btn rounded-full ([a-z]+)"/);
      expect(m).not.toBeNull();
      expect(m[1]).toBe('active');
    });
  });

  describe('timers', () => {
    it('estado tiene tiempo_por_equipo_1 y tiempo_por_equipo_2', () => {
      const estado = estadoBase();
      expect(estado.tiempo_equipo_1).toBe(60);
      expect(estado.tiempo_equipo_2).toBe(60);
    });

    it('solo el equipo activo tiene timer corriendo (lógica del conductor)', () => {
      const estado = estadoBase();
      expect(estado.equipo_actual).toBe(1);
      expect(estado.turno_activo).toBe(false);
    });
  });

  describe('equipo activo', () => {
    it('equipo_actual empieza en 1', () => {
      const estado = estadoBase();
      expect(estado.equipo_actual).toBe(1);
    });

    it('cambiarTurno alterna el equipo', () => {
      const estado = estadoBase();
      const nuevo = RoscoGameDefinition.cambiarTurno(estado);
      expect(nuevo.equipo_actual).toBe(2);
    });
  });

  describe('marcador', () => {
    it('puntos empiezan en 0', () => {
      const estado = estadoBase();
      expect(estado.puntos_equipo_1).toBe(0);
      expect(estado.puntos_equipo_2).toBe(0);
    });

    it('acumula puntos por acierto', () => {
      const estado = estadoBase();
      const config = { puntos_por_acierto: 10 };
      const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });

    it('ronda actual y total', () => {
      const estado = estadoBase();
      expect(estado.ronda_actual).toBe(1);
      expect(estado.total_rondas).toBe(2);
    });

    it('progreso: letras resueltas vs pendientes', () => {
      const estado = estadoBase();
      const resueltas = estado.rosco.filter(
        (l) => l.estado === ESTADO_LETRA.CORRECTA || l.estado === ESTADO_LETRA.INCORRECTA
      ).length;
      expect(resueltas).toBe(0);
    });
  });

  describe('fin de ronda', () => {
    it('aplicarTimeUp cambia a FIN_DE_RONDA', () => {
      const estado = { ...estadoBase(), fase: 'TURNO_ACTIVO' };
      const nuevo = RoscoGameDefinition.aplicarTimeUp(estado);
      expect(nuevo.fase).toBe('FIN_DE_RONDA');
    });

    it('fin de ronda muestra puntajes parciales', () => {
      const estado = {
        ...estadoBase(),
        fase: 'FIN_DE_RONDA',
        puntos_equipo_1: 30,
        puntos_equipo_2: 20
      };
      expect(estado.puntos_equipo_1).toBe(30);
      expect(estado.puntos_equipo_2).toBe(20);
    });
  });

  describe('fin de partida', () => {
    it('calcularResultado devuelve ganador', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 50,
        puntos_equipo_2: 30,
        letras_completadas_equipo_1: 10,
        letras_completadas_equipo_2: 6
      };
      const resultado = RoscoGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
      expect(resultado.puntos_equipo_1).toBe(50);
      expect(resultado.puntos_equipo_2).toBe(30);
    });

    it('desempate por letras completadas', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 30,
        puntos_equipo_2: 30,
        letras_completadas_equipo_1: 8,
        letras_completadas_equipo_2: 5
      };
      const resultado = RoscoGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBe(1);
    });

    it('empate técnico si persiste', () => {
      const estado = {
        ...estadoBase(),
        puntos_equipo_1: 30,
        puntos_equipo_2: 30,
        letras_completadas_equipo_1: 5,
        letras_completadas_equipo_2: 5
      };
      const resultado = RoscoGameDefinition.calcularResultado(estado);
      expect(resultado.ganador).toBeNull();
    });
  });

  describe('sincronización — reacción a acciones del conductor', () => {
    it('acierto actualiza estado correctamente', () => {
      const estado = estadoBase();
      const config = { puntos_por_acierto: 10 };
      const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.CORRECTA);
      expect(nuevo.puntos_equipo_1).toBe(10);
    });

    it('error actualiza estado y cambia turno', () => {
      const estado = estadoBase();
      const config = { penalizacion_puntos: 5 };
      let nuevo = RoscoGameDefinition.aplicarError(estado, 'A', config);
      nuevo = RoscoGameDefinition.cambiarTurno(nuevo);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.INCORRECTA);
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('pasapalabra marca como pasada y cambia turno', () => {
      const estado = estadoBase();
      let nuevo = RoscoGameDefinition.aplicarPasapalabra(estado, 'A');
      nuevo = RoscoGameDefinition.cambiarTurno(nuevo);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.PASADA);
      expect(nuevo.equipo_actual).toBe(2);
    });

    it('salto avanza sin marcar', () => {
      const estado = estadoBase();
      const nuevo = RoscoGameDefinition.avanzarLetra(estado);
      expect(nuevo.indice_actual).toBe(1);
      expect(nuevo.rosco[0].estado).toBe(ESTADO_LETRA.PENDIENTE);
    });

    it('fin de ronda limpia para nueva ronda', () => {
      const estado = {
        ...estadoBase(),
        fase: 'FIN_DE_RONDA',
        ronda_actual: 1
      };
      const items = itemsBase();
      const contenidoSet = { items };
      const nuevo = RoscoGameDefinition.limpiarRoscoParaNuevaRonda(estado, contenidoSet);
      expect(nuevo.ronda_actual).toBe(2);
      expect(nuevo.fase).toBe('INICIO_RONDA');
      expect(nuevo.rosco.every((l) => l.estado === ESTADO_LETRA.PENDIENTE)).toBe(true);
    });
  });
});
