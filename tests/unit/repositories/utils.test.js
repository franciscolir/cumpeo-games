import { describe, it, expect } from 'vitest';
import { ahora, nuevoId, esperadoVersion, validarNoVacio } from '../../../src/repositories/utils.js';

describe('utils', () => {
  it('ahora() devuelve ISO 8601 UTC', () => {
    expect(ahora()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('nuevoId() devuelve un UUID v4', () => {
    const id = nuevoId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('nuevoId() devuelve IDs distintos', () => {
    expect(nuevoId()).not.toBe(nuevoId());
  });

  it('esperadoVersion() devuelve el campo version', () => {
    expect(esperadoVersion({ version: 5 })).toBe(5);
  });

  it('esperadoVersion() tira si falta el campo', () => {
    expect(() => esperadoVersion({})).toThrow(/version/);
  });

  it('validarNoVacio() acepta strings', () => {
    expect(() => validarNoVacio('x', 'campo')).not.toThrow();
  });

  it('validarNoVacio() rechaza strings vacíos', () => {
    expect(() => validarNoVacio('', 'campo')).toThrow();
    expect(() => validarNoVacio('   ', 'campo')).toThrow();
  });

  it('validarNoVacio() rechaza null/undefined', () => {
    expect(() => validarNoVacio(null, 'campo')).toThrow();
    expect(() => validarNoVacio(undefined, 'campo')).toThrow();
  });
});
