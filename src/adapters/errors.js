/* =============================================================
   Errores tipados de la capa de datos
   ============================================================= */

export class DataError extends Error {
  constructor(mensaje, causa = null) {
    super(mensaje);
    this.name = 'DataError';
    this.causa = causa;
  }
}

export class IndexedDBError extends DataError {
  constructor(mensaje, causa = null) {
    super(mensaje, causa);
    this.name = 'IndexedDBError';
  }
}

export class BaseNoAbiertaError extends DataError {
  constructor() {
    super('La base de datos no está abierta. Llamá a abrir() primero.');
    this.name = 'BaseNoAbiertaError';
  }
}

export class TransaccionError extends DataError {
  constructor(mensaje, causa = null) {
    super(mensaje, causa);
    this.name = 'TransaccionError';
  }
}

export class NotImplementedError extends DataError {
  constructor(metodo) {
    super(`${metodo} no implementado`);
    this.name = 'NotImplementedError';
  }
}

export class StoreNoExisteError extends DataError {
  constructor(store) {
    super(`Object store inexistente: "${store}"`);
    this.name = 'StoreNoExisteError';
    this.store = store;
  }
}
