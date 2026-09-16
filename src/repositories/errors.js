/* =============================================================
   Errores tipados de repositorio / dominio.
   Todos heredan de DataError para que la UI pueda capturarlos
   de forma genérica.
   ============================================================= */

import { DataError } from '../adapters/errors.js';

export class ValidacionError extends DataError {
  constructor(mensaje, detalles = null) {
    super(mensaje);
    this.name = 'ValidacionError';
    this.detalles = detalles;
  }
}

export class NoEncontradoError extends DataError {
  constructor(entidad, id = null) {
    super(`${entidad} no encontrado${id ? `: ${id}` : ''}`);
    this.name = 'NoEncontradoError';
    this.entidad = entidad;
    this.id = id;
  }
}

export class YaExisteError extends DataError {
  constructor(entidad, id = null) {
    super(`${entidad} ya existe${id ? `: ${id}` : ''}`);
    this.name = 'YaExisteError';
    this.entidad = entidad;
    this.id = id;
  }
}

export class ConflictoVersionError extends DataError {
  constructor(entidad, esperada, actual) {
    super(`Conflicto de versión en ${entidad}: esperada ${esperada}, actual ${actual}`);
    this.name = 'ConflictoVersionError';
    this.entidad = entidad;
    this.esperada = esperada;
    this.actual = actual;
  }
}

export class SinControlError extends DataError {
  constructor(partidaId = null) {
    super(`Sin control activo sobre la partida${partidaId ? ` ${partidaId}` : ''}`);
    this.name = 'SinControlError';
    this.partidaId = partidaId;
  }
}

export class OperacionInvalidaError extends DataError {
  constructor(mensaje, contexto = null) {
    super(mensaje);
    this.name = 'OperacionInvalidaError';
    this.contexto = contexto;
  }
}

export class CircuitoNoEditableError extends DataError {
  constructor(circuitoId, estado) {
    super(`El circuito ${circuitoId} no es editable (estado: ${estado})`);
    this.name = 'CircuitoNoEditableError';
    this.circuitoId = circuitoId;
    this.estado = estado;
  }
}

export class PublicCodigoDuplicadoError extends DataError {
  constructor(publicCodigo) {
    super(`public_codigo ya en uso: ${publicCodigo}`);
    this.name = 'PublicCodigoDuplicadoError';
    this.publicCodigo = publicCodigo;
  }
}

export class SnapshotReferenciadoError extends DataError {
  constructor(snapshotId) {
    super(`No se puede eliminar el snapshot ${snapshotId}: tiene referencias`);
    this.name = 'SnapshotReferenciadoError';
    this.snapshotId = snapshotId;
  }
}
