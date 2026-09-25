import { describe, it, expect } from 'vitest';
import { _renderAccionesConductor } from '../../../../../src/ui/partidas/shell-partida.js';

describe('_renderAccionesConductor (contrato accionesConductor — 8.5a)', () => {
  it('renderiza botón primario con data-accion-conductor', () => {
    const html = _renderAccionesConductor([
      { tipo: 'primario', texto: 'Comenzar ronda', accion: 'iniciar-ronda-trivia' }
    ]);

    expect(html).toContain('data-accion-conductor="iniciar-ronda-trivia"');
    expect(html).toContain('Comenzar ronda');
    expect(html).toContain('bg-primary');
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
  });

  it('renderiza botón fantasma deshabilitado con payload escapado', () => {
    const html = _renderAccionesConductor([
      {
        tipo: 'fantasma',
        texto: 'Validar',
        accion: 'validar-respuesta-trivia',
        disabled: true,
        payload: { set: { id: 's1', nombre: 'Set "A" & B' } }
      }
    ]);

    expect(html).toContain('data-accion-conductor="validar-respuesta-trivia"');
    expect(html).toContain('disabled');
    expect(html).toContain('bg-surface-container-lowest');
    expect(html).toContain('data-accion-payload="');
    expect(html).not.toContain('data-accion-payload="{"');
  });

  it('renderiza selector con opciones y valorActual marcado', () => {
    const html = _renderAccionesConductor([
      {
        tipo: 'selector',
        label: 'Equipo activo',
        opciones: [
          { valor: 1, texto: 'Eq1' },
          { valor: 2, texto: 'Eq2' }
        ],
        valorActual: 2,
        accion: 'cambiar-equipo'
      }
    ]);

    expect(html).toContain('<select');
    expect(html).toContain('data-accion-conductor="cambiar-equipo"');
    expect(html).toContain('Equipo activo');
    expect(html).toContain('<option value="1">Eq1</option>');
    expect(html).toContain('<option value="2" selected>Eq2</option>');
  });

  it('renderiza input number con label, min y max', () => {
    const html = _renderAccionesConductor([
      {
        tipo: 'input',
        label: 'Puntos para Eq1',
        tipoInput: 'number',
        min: 0,
        max: 100,
        valorActual: 0,
        accion: 'asignar-puntos'
      }
    ]);

    expect(html).toContain('<input');
    expect(html).toContain('type="number"');
    expect(html).toContain('data-accion-conductor="asignar-puntos"');
    expect(html).toContain('Puntos para Eq1');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="100"');
    expect(html).toContain('value="0"');
  });

  it('renderiza mensaje variante error e info sin acción', () => {
    const error = _renderAccionesConductor([
      { tipo: 'mensaje', texto: 'No hay sets disponibles.', variante: 'error' }
    ]);
    const info = _renderAccionesConductor([
      { tipo: 'mensaje', texto: 'Elegí un set' }
    ]);

    expect(error).toContain('No hay sets disponibles.');
    expect(error).toContain('text-error');
    expect(error).not.toContain('data-accion-conductor');

    expect(info).toContain('Elegí un set');
    expect(info).toContain('text-on-surface-variant');
    expect(info).not.toContain('data-accion-conductor');
  });

  it('agrupa botones consecutivos en una fila flex-wrap', () => {
    const html = _renderAccionesConductor([
      { tipo: 'primario', texto: 'Validar', accion: 'validar-respuesta-trivia' },
      { tipo: 'fantasma', texto: 'Pasar', accion: 'pasar-pregunta-trivia' }
    ]);

    expect(html).toContain('flex flex-wrap gap-2');
    expect((html.match(/data-accion-conductor=/g) || []).length).toBe(2);
  });

  it('devuelve array vacío como panel vacío', () => {
    expect(_renderAccionesConductor([])).toContain('flex flex-col');
    expect(_renderAccionesConductor([])).not.toContain('data-accion-conductor');
  });

  // Extensiones 8.5c.1

  it('input con payload inyecta data-accion-payload escapado', () => {
    const html = _renderAccionesConductor([
      {
        tipo: 'input',
        label: 'Bonus',
        tipoInput: 'number',
        accion: 'aplicar-bonus-pictionary',
        payload: { equipo: 1, "obs": 'a"b & c' }
      }
    ]);

    expect(html).toContain('data-accion-conductor="aplicar-bonus-pictionary"');
    expect(html).toContain('data-accion-payload="');
    expect(html).not.toContain('data-accion-payload="{"');
  });

  it('input sin payload no tiene data-accion-payload', () => {
    const html = _renderAccionesConductor([
      { tipo: 'input', label: 'Puntos', tipoInput: 'number', accion: 'asignar-puntos' }
    ]);

    expect(html).toContain('data-accion-conductor="asignar-puntos"');
    expect(html).not.toContain('data-accion-payload');
  });

  it('selector con payload inyecta data-accion-payload', () => {
    const html = _renderAccionesConductor([
      {
        tipo: 'selector',
        label: 'Ronda',
        opciones: [{ valor: 1, texto: '1' }],
        valorActual: 1,
        accion: 'cambiar-turno-manual-memoria',
        payload: { equipo: 2 }
      }
    ]);

    expect(html).toContain('<select');
    expect(html).toContain('data-accion-conductor="cambiar-turno-manual-memoria"');
    expect(html).toContain('data-accion-payload="{&quot;equipo&quot;:2}"');
  });

  it('descriptor html inyecta HTML sin escapar', () => {
    const html = _renderAccionesConductor([
      { tipo: 'html', html: '<p class="bg-[#fff9e6]">RESPUESTA: <b>¡Á&amp;O!</b></p>' }
    ]);

    expect(html).toContain('<p class="bg-[#fff9e6]">RESPUESTA: <b>¡Á&amp;O!</b></p>');
    expect(html).not.toContain('&lt;p class');
    expect(html).not.toContain('data-accion-conductor');
  });
});
