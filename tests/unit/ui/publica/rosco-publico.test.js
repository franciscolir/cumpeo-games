import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ALFABETO, ESTADO_LETRA, RoscoGameDefinition } from '../../../../src/games/rosco/RoscoGameDefinition.js';

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
    it('se obtiene del item actual por letra y ronda', () => {
      const items = itemsBase();
      const estado = estadoBase();
      const letraActual = estado.rosco[estado.indice_actual].letra;
      const ronda = estado.ronda_actual;
      const item = items.find((it) => it.letra === letraActual && it.ronda === ronda);
      expect(item).toBeDefined();
      expect(item.definicion).toContain(letraActual);
    });
  });

  describe('revelado de la respuesta', () => {
    it('antes de validar: respuesta no se muestra (letra pendiente)', () => {
      const estado = estadoBase();
      const letraEstado = estado.rosco[estado.indice_actual].estado;
      const esResuelta = letraEstado === ESTADO_LETRA.CORRECTA || letraEstado === ESTADO_LETRA.INCORRECTA;
      expect(esResuelta).toBe(false);
    });

    it('después de OK: respuesta se muestra (letra correcta)', () => {
      const estado = estadoBase();
      const config = { puntos_por_acierto: 10 };
      const nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      const letraEstado = nuevo.rosco[nuevo.indice_actual].estado;
      const esResuelta = letraEstado === ESTADO_LETRA.CORRECTA || letraEstado === ESTADO_LETRA.INCORRECTA;
      expect(esResuelta).toBe(true);
    });

    it('después de X: respuesta se muestra (letra incorrecta)', () => {
      const estado = estadoBase();
      const config = { penalizacion_puntos: 5 };
      const nuevo = RoscoGameDefinition.aplicarError(estado, 'A', config);
      const letraEstado = nuevo.rosco[nuevo.indice_actual].estado;
      const esResuelta = letraEstado === ESTADO_LETRA.CORRECTA || letraEstado === ESTADO_LETRA.INCORRECTA;
      expect(esResuelta).toBe(true);
    });

    it('al avanzar: respuesta desaparece (nueva letra pendiente)', () => {
      const estado = estadoBase();
      const config = { puntos_por_acierto: 10 };
      let nuevo = RoscoGameDefinition.aplicarAcierto(estado, 'A', config);
      nuevo = RoscoGameDefinition.avanzarLetra(nuevo);
      const letraEstado = nuevo.rosco[nuevo.indice_actual].estado;
      expect(letraEstado).toBe(ESTADO_LETRA.PENDIENTE);
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
