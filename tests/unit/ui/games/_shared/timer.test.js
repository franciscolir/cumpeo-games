import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crearTimer } from '../../../../../src/ui/games/_shared/timer.js';

describe('crearTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('inicia y emite ticks cada segundo', () => {
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 3, onTick });

    timer.iniciar();

    expect(onTick).toHaveBeenCalledWith(3);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(0);
  });

  it('llama a onCierre al llegar a 0', () => {
    const onCierre = vi.fn();
    const timer = crearTimer({ duracionSeg: 2, onCierre });

    timer.iniciar();
    vi.advanceTimersByTime(1000);
    expect(onCierre).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onCierre).toHaveBeenCalledTimes(1);
    expect(timer.estaActivo()).toBe(false);
  });

  it('cancelar detiene el timer', () => {
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 5, onTick });

    timer.iniciar();
    expect(timer.estaActivo()).toBe(true);

    timer.cancelar();
    expect(timer.estaActivo()).toBe(false);

    onTick.mockClear();
    vi.advanceTimersByTime(3000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('reset vuelve a duracionSeg', () => {
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 3, onTick });

    timer.iniciar();
    vi.advanceTimersByTime(2000);

    timer.reset();
    expect(timer.restanteActual()).toBe(3);
    expect(timer.estaActivo()).toBe(false);
  });

  it('iniciarSiCambio con la misma key no reinicia', () => {
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 3, onTick });

    timer.iniciarSiCambio('k1');
    expect(onTick).toHaveBeenCalledTimes(1);

    timer.iniciarSiCambio('k1');
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('iniciarSiCambio con key distinta reinicia', () => {
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 3, onTick });

    timer.iniciarSiCambio('k1');
    expect(onTick).toHaveBeenCalledWith(3);

    timer.iniciarSiCambio('k2');
    expect(onTick).toHaveBeenCalledWith(3);
    expect(timer.estaActivo()).toBe(true);
  });

  it('iniciarSiCambio reinicia si el timer terminó', () => {
    const onCierre = vi.fn();
    const onTick = vi.fn();
    const timer = crearTimer({ duracionSeg: 2, onTick, onCierre });

    timer.iniciarSiCambio('k1');
    vi.advanceTimersByTime(2000);
    expect(timer.estaActivo()).toBe(false);
    expect(onCierre).toHaveBeenCalledTimes(1);

    timer.iniciarSiCambio('k1');
    expect(timer.estaActivo()).toBe(true);
  });

  it('estaActivo devuelve el estado', () => {
    const timer = crearTimer({ duracionSeg: 3, onTick: () => {} });

    expect(timer.estaActivo()).toBe(false);
    timer.iniciar();
    expect(timer.estaActivo()).toBe(true);
    timer.cancelar();
    expect(timer.estaActivo()).toBe(false);
  });

  it('restanteActual devuelve el restante', () => {
    const timer = crearTimer({ duracionSeg: 5, onTick: () => {} });

    expect(timer.restanteActual()).toBe(5);
    timer.iniciar();
    vi.advanceTimersByTime(2000);
    expect(timer.restanteActual()).toBe(3);
  });
});
