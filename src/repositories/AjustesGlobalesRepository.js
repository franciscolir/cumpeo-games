/* =============================================================
   AjustesGlobalesRepository — ajustes globales de la app.
   Fila singleton (id = 'default').
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { ValidacionError } from './errors.js';
import { ahora } from './utils.js';

const STORE = 'ajustes_globales';
const ID_SINGLETON = 'default';
const TIEMPO_MAX_PAUSA_DEFAULT = 120;

export class AjustesGlobalesRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  /**
   * Obtiene los ajustes globales. Si no existe la fila, la crea con defaults.
   * @returns {Promise<object>} { id, tiempo_max_pausa_seg, created_at, updated_at }
   */
  async obtener() {
    if (this.modo === 'supabase') {
      const filas = await this.adapter.query(this.storeName, {
        eq: { id: ID_SINGLETON },
        single: true
      });
      if (filas) return filas;
      const nuevo = this._construirDefault();
      await this.agregarRegistro(nuevo);
      return nuevo;
    }

    const existente = await super.obtener(ID_SINGLETON).catch(() => null);
    if (existente) return existente;

    const nuevo = this._construirDefault();
    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.agregar(tx, nuevo);
    });
    return nuevo;
  }

  /**
   * Actualiza los ajustes globales.
   * @param {object} cambios - { tiempo_max_pausa_seg? }
   * @returns {Promise<object>} ajustes actualizados.
   */
  async actualizar(cambios) {
    const actual = await this.obtener();

    const actualizado = { ...actual };

    if (Object.prototype.hasOwnProperty.call(cambios, 'tiempo_max_pausa_seg')) {
      const v = cambios.tiempo_max_pausa_seg;
      if (!Number.isInteger(v) || v <= 0) {
        throw new ValidacionError('tiempo_max_pausa_seg debe ser un entero > 0');
      }
      actualizado.tiempo_max_pausa_seg = v;
    }

    actualizado.updated_at = ahora();

    if (this.modo === 'supabase') {
      await this.actualizarRegistro(actualizado);
      return actualizado;
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  _construirDefault() {
    const ts = ahora();
    return {
      id: ID_SINGLETON,
      tiempo_max_pausa_seg: TIEMPO_MAX_PAUSA_DEFAULT,
      created_at: ts,
      updated_at: ts
    };
  }
}
