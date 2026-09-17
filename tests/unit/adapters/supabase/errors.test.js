import { describe, it, expect } from 'vitest';
import { traducirError } from '../../../../src/adapters/supabase/errors.js';
import {
  YaExisteError,
  NoEncontradoError,
  ValidacionError,
  OperacionInvalidaError
} from '../../../../src/repositories/errors.js';

describe('traducirError', () => {
  it('retorna OperacionInvalidaError genérico si error es null', () => {
    const err = traducirError(null);
    expect(err).toBeInstanceOf(OperacionInvalidaError);
    expect(err.message).toBe('Error desconocido de Supabase');
  });

  it('retorna YaExisteError para unique_violation (23505)', () => {
    const err = traducirError({
      code: '23505',
      message: 'duplicate key value',
      details: 'Key (codigo)=(TRIVIA) already exists'
    });
    expect(err).toBeInstanceOf(YaExisteError);
    expect(err.message).toContain('duplicate key value');
  });

  it('extrae la entidad del detalle en 23505', () => {
    const err = traducirError({
      code: '23505',
      message: 'dup',
      details: 'Key (nombre)=(Test) already exists'
    });
    expect(err.entidad).toBe('nombre');
  });

  it('retorna OperacionInvalidaError para foreign_key_violation (23503)', () => {
    const err = traducirError({
      code: '23503',
      message: 'foreign key violation'
    });
    expect(err).toBeInstanceOf(OperacionInvalidaError);
  });

  it('retorna ValidacionError para check_violation (23514)', () => {
    const err = traducirError({
      code: '23514',
      message: 'new row violates check constraint'
    });
    expect(err).toBeInstanceOf(ValidacionError);
  });

  it('retorna NoEncontradoError para PGRST116 (no rows)', () => {
    const err = traducirError({
      code: 'PGRST116',
      message: 'No rows returned'
    });
    expect(err).toBeInstanceOf(NoEncontradoError);
  });

  it('retorna OperacionInvalidaError para undefined_table (42P01)', () => {
    const err = traducirError({
      code: '42P01',
      message: 'relation "tabla_inexistente" does not exist'
    });
    expect(err).toBeInstanceOf(OperacionInvalidaError);
    expect(err.message).toContain('Tabla inexistente');
  });

  it('retorna error de dominio si ya es un error de dominio', () => {
    const original = new YaExisteError('Juego', 'TRIVIA');
    const err = traducirError(original);
    expect(err).toBe(original);
    expect(err).toBeInstanceOf(YaExisteError);
  });

  it('retorna OperacionInvalidaError para error desconocido', () => {
    const err = traducirError({ message: 'algo raro pasó' });
    expect(err).toBeInstanceOf(OperacionInvalidaError);
    expect(err.message).toContain('algo raro pasó');
  });

  it('maneja error sin code', () => {
    const err = traducirError({ message: 'sin código' });
    expect(err).toBeInstanceOf(OperacionInvalidaError);
  });

  it('extrae PGRST del message si code no está', () => {
    const err = traducirError({ message: 'PGRST116 no rows' });
    expect(err).toBeInstanceOf(NoEncontradoError);
  });
});
