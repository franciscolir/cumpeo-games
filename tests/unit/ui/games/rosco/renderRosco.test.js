import { describe, it, expect } from 'vitest';
import { renderRosco } from '../../../../../src/ui/games/rosco/renderRosco.js';
import { ALFABETO, ESTADO_LETRA, RoscoGameDefinition } from '../../../../../src/games/rosco/RoscoGameDefinition.js';

const CONFIG = { rondas: 1, segundos_por_equipo: 60, puntos_por_acierto: 10, penalizacion_puntos: 5 };
const CIRC = 2 * Math.PI * 180;

function estadoBase(sets = null) {
  return RoscoGameDefinition.estadoInicial(CONFIG, sets);
}

function itemsBase() {
  return ALFABETO.map((letra) => ({
    letra,
    definicion: `Definición de la letra ${letra}`,
    respuesta: `Respuesta ${letra}`
  }));
}

function estadoConSet() {
  return estadoBase([{ id: 's1', items: itemsBase() }]);
}

function extraerPosicion(html, letra) {
  const m = html.match(new RegExp(`data-letra="${letra}"[^>]*style="left: ([\\d.-]+)%; top: ([\\d.-]+)%;"`));
  return m ? { left: parseFloat(m[1]), top: parseFloat(m[2]) } : null;
}

function posEsperada(i, total) {
  const angleDeg = (360 / total) * i;
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    left: 50 + 41 * Math.cos(angleRad),
    top: 50 + 41 * Math.sin(angleRad)
  };
}

function extraerClaseBoton(html, index) {
  const nodoMatch = html.match(new RegExp(`data-index="${index}"[\\s\\S]*?<button[^>]*class="letter-btn rounded-full ([a-z]+)"`));
  return nodoMatch ? nodoMatch[1] : null;
}

describe('renderRosco', () => {
  describe('contrato', () => {
    it('es una función exportada', () => {
      expect(typeof renderRosco).toBe('function');
    });

    it('devuelve un string con .rosco-circular', () => {
      const html = renderRosco(estadoBase());
      expect(typeof html).toBe('string');
      expect(html).toContain('rosco-circular');
    });

    it('no lanza error con estado vacío', () => {
      expect(() => renderRosco({})).not.toThrow();
      expect(() => renderRosco(undefined)).not.toThrow();
      expect(() => renderRosco(null)).not.toThrow();
    });
  });

  describe('posiciones en el círculo (N=27)', () => {
    it('renderiza 27 letter-node con data-letra del alfabeto', () => {
      const html = renderRosco(estadoBase());
      const nodes = html.match(/data-letra="/g) || [];
      expect(nodes).toHaveLength(27);
      for (const letra of ALFABETO) {
        expect(html).toContain(`data-letra="${letra}"`);
      }
    });

    it('la letra i=0 está arriba (left 50%, top 9%)', () => {
      const html = renderRosco(estadoBase());
      const pos = extraerPosicion(html, 'A');
      expect(pos).not.toBeNull();
      expect(pos.left).toBeCloseTo(50, 1);
      expect(pos.top).toBeCloseTo(9, 1);
    });

    it('la letra i=7 sigue la fórmula del ángulo (360/27 * i)', () => {
      const html = renderRosco(estadoBase());
      const pos = extraerPosicion(html, ALFABETO[7]);
      const esp = posEsperada(7, 27);
      expect(pos.left).toBeCloseTo(esp.left, 1);
      expect(pos.top).toBeCloseTo(esp.top, 1);
    });

    it('todas las letras caen dentro del rango [9%, 91%]', () => {
      const html = renderRosco(estadoBase());
      for (const letra of ALFABETO) {
        const pos = extraerPosicion(html, letra);
        expect(pos).not.toBeNull();
        expect(pos.left).toBeGreaterThanOrEqual(8.99);
        expect(pos.left).toBeLessThanOrEqual(91.01);
        expect(pos.top).toBeGreaterThanOrEqual(8.99);
        expect(pos.top).toBeLessThanOrEqual(91.01);
      }
    });

    it('los data-index van de 0 a 26', () => {
      const html = renderRosco(estadoBase());
      for (let i = 0; i < 27; i++) {
        expect(html).toContain(`data-index="${i}"`);
      }
    });
  });

  describe('clases de estado y activa', () => {
    it('letra pendiente usa clase pending', () => {
      const html = renderRosco(estadoBase());
      expect(extraerClaseBoton(html, 3)).toBe('pending');
    });

    it('letra actual (indice_actual) usa clase active', () => {
      const html = renderRosco(estadoBase());
      expect(extraerClaseBoton(html, 0)).toBe('active');
    });

    it('al avanzar el índice, active se mueve a la nueva letra', () => {
      const estado = estadoBase();
      estado.indice_actual = 5;
      const html = renderRosco(estado);
      expect(extraerClaseBoton(html, 4)).toBe('pending');
      expect(extraerClaseBoton(html, 5)).toBe('active');
    });

    it('correcta usa clase green e ícono ✓', () => {
      const estado = estadoBase();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      const html = renderRosco(estado);
      expect(extraerClaseBoton(html, 0)).toBe('green');
      expect(html).toContain('✓');
    });

    it('incorrecta usa clase red e ícono ✗', () => {
      const estado = estadoBase();
      estado.rosco[1].estado = ESTADO_LETRA.INCORRECTA;
      const html = renderRosco(estado);
      expect(extraerClaseBoton(html, 1)).toBe('red');
      expect(html).toContain('✗');
    });

    it('pasada usa clase pasada e ícono →', () => {
      const estado = estadoBase();
      estado.rosco[2].estado = ESTADO_LETRA.PASADA;
      const html = renderRosco(estado);
      expect(extraerClaseBoton(html, 2)).toBe('pasada');
      expect(html).toContain('→');
    });

    it('una letra resuelta en el índice actual prioriza su estado sobre active', () => {
      const estado = estadoBase();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      const html = renderRosco(estado);
      expect(extraerClaseBoton(html, 0)).toBe('green');
    });
  });

  describe('anillo SVG de progreso', () => {
    it('incluye <svg id="rosco-progress"> por defecto', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('<svg id="rosco-progress"');
    });

    it('mostrarAnillo: false omite el SVG', () => {
      const html = renderRosco(estadoBase(), { mostrarAnillo: false });
      expect(html).not.toContain('rosco-progress');
    });

    it('stroke-dasharray es la circunferencia r=180', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain(`stroke-dasharray="${CIRC.toFixed(2)}"`);
    });

    it('progreso 0 → dashoffset = circunferencia completa', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain(`stroke-dashoffset="${CIRC.toFixed(2)}"`);
    });

    it('1 acierto → dashoffset = circ * (1 - 1/27)', () => {
      const estado = estadoBase();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      const html = renderRosco(estado);
      const esperado = (CIRC * (1 - 1 / 27)).toFixed(2);
      expect(html).toContain(`stroke-dashoffset="${esperado}"`);
    });

    it('27 aciertos → dashoffset = 0', () => {
      const estado = estadoBase();
      for (const letra of estado.rosco) letra.estado = ESTADO_LETRA.CORRECTA;
      const html = renderRosco(estado);
      expect(html).toContain('stroke-dashoffset="0.00"');
    });

    it('el anillo está rotado -90 para arrancar arriba', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('transform="rotate(-90 200 200)"');
    });
  });

  describe('tarjeta central', () => {
    it('muestra .rosco-central con la letra actual en el badge', () => {
      const html = renderRosco(estadoConSet());
      expect(html).toContain('rosco-central');
      expect(html).toContain('rosco-letter-badge');
      expect(html).toContain('>A<');
    });

    it('la definición sale de set_ronda_actual.items', () => {
      const html = renderRosco(estadoConSet());
      expect(html).toContain('Definición de la letra A');
    });

    it('muestra "Sin definición" si el set no trae items', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('Sin definición');
    });

    it('la definición sigue a la letra al avanzar el índice', () => {
      const estado = estadoConSet();
      estado.indice_actual = 1;
      const html = renderRosco(estado);
      expect(html).toContain('rosco-letter-badge');
      expect(html).toContain('Definición de la letra B');
    });
  });

  describe('respuesta condicional', () => {
    it('mostrarRespuesta: false (default) no muestra la respuesta', () => {
      const html = renderRosco(estadoConSet());
      expect(html).not.toContain('rosco-respuesta');
      expect(html).not.toContain('Respuesta A');
    });

    it('mostrarRespuesta: true muestra la respuesta', () => {
      const html = renderRosco(estadoConSet(), { mostrarRespuesta: true, respuesta: 'Respuesta A' });
      expect(html).toContain('rosco-respuesta');
      expect(html).toContain('Respuesta A');
    });

    it('mostrarRespuesta: true con respuesta vacía no muestra el bloque', () => {
      const html = renderRosco(estadoConSet(), { mostrarRespuesta: true, respuesta: '' });
      expect(html).not.toContain('rosco-respuesta');
    });

    it('la respuesta no depende de que la letra esté resuelta (la decide el caller)', () => {
      const html = renderRosco(estadoConSet(), { mostrarRespuesta: false, respuesta: 'Secreto' });
      expect(html).not.toContain('Secreto');
    });
  });

  describe('leyenda', () => {
    it('se muestra por defecto con 4 dots', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('rosco-legend');
      expect(html).toContain('legend-dot green');
      expect(html).toContain('legend-dot red');
      expect(html).toContain('legend-dot yellow');
      expect(html).toContain('legend-dot white');
    });

    it('conteos iniciales: 0 Verdes • 0 Rojas • 27 Restantes', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('0 Verdes • 0 Rojas • 27 Restantes');
    });

    it('conteos tras 1 acierto y 1 error', () => {
      const estado = estadoBase();
      estado.rosco[0].estado = ESTADO_LETRA.CORRECTA;
      estado.rosco[1].estado = ESTADO_LETRA.INCORRECTA;
      const html = renderRosco(estado);
      expect(html).toContain('1 Verdes • 1 Rojas • 25 Restantes');
    });

    it('las pasadas cuentan como restantes', () => {
      const estado = estadoBase();
      estado.rosco[0].estado = ESTADO_LETRA.PASADA;
      const html = renderRosco(estado);
      expect(html).toContain('0 Verdes • 0 Rojas • 27 Restantes');
    });

    it('mostrarLeyenda: false omite la leyenda', () => {
      const html = renderRosco(estadoBase(), { mostrarLeyenda: false });
      expect(html).not.toContain('rosco-legend');
    });
  });

  describe('tamaño de letra', () => {
    it('default es md', () => {
      const html = renderRosco(estadoBase());
      expect(html).toContain('rosco-size-md');
      expect(html).not.toContain('rosco-size-lg');
    });

    it("tamañoLetra: 'lg' aplica rosco-size-lg", () => {
      const html = renderRosco(estadoBase(), { tamañoLetra: 'lg' });
      expect(html).toContain('rosco-size-lg');
      expect(html).not.toContain('rosco-size-md');
    });

    it("'md' aplica rosco-size-md explícito", () => {
      const html = renderRosco(estadoBase(), { tamañoLetra: 'md' });
      expect(html).toContain('rosco-size-md');
    });
  });
});
