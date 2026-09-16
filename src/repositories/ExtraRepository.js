/* =============================================================
   ExtraRepository — catálogo de extras (parte H3.b).
   Registro de uso (registrarUso) se agrega en H3.f.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  YaExisteError,
  NoEncontradoError,
  ValidacionError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'extras';

export class ExtraRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  async obtenerExtra(extraId) {
    return this.obtener(extraId);
  }

  async obtenerExtraPorCodigo(codigo) {
    validarNoVacio(codigo, 'codigo');
    const lista = await this.listarPorIndice('extra_codigo', codigo);
    return lista[0] || null;
  }

  async listarExtras({ incluirInactivos = false } = {}) {
    const todos = await this.listar();
    const filtrados = incluirInactivos ? todos : todos.filter((e) => e.activo === true);
    return filtrados.sort((a, b) => this._comparar(a, b));
  }

  async crearExtra({
    codigo,
    nombre,
    descripcion = null,
    configuracion_default = null,
    orden_catalogo = null
  }) {
    validarNoVacio(codigo, 'codigo');
    validarNoVacio(nombre, 'nombre');

    const existente = await this.obtenerExtraPorCodigo(codigo);
    if (existente) throw new YaExisteError('Extra', codigo);

    const ts = ahora();
    const extra = {
      id: nuevoId(),
      codigo,
      nombre,
      descripcion,
      configuracion_default,
      orden_catalogo,
      activo: true,
      created_at: ts,
      updated_at: ts
    };

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.agregar(tx, extra);
    });

    return extra;
  }

  async actualizarExtra(extraId, cambios) {
    const actual = await this.obtener(extraId);
    if (!actual) throw new NoEncontradoError('Extra', extraId);

    if (Object.prototype.hasOwnProperty.call(cambios, 'codigo') &&
        cambios.codigo !== actual.codigo) {
      throw new ValidacionError('El código del extra es inmutable', { campo: 'codigo' });
    }

    const permitidos = ['nombre', 'descripcion', 'configuracion_default', 'orden_catalogo'];
    const actualizado = { ...actual };

    for (const campo of permitidos) {
      if (Object.prototype.hasOwnProperty.call(cambios, campo)) {
        actualizado[campo] = cambios[campo];
      }
    }

    if (actualizado.nombre != null) validarNoVacio(actualizado.nombre, 'nombre');

    actualizado.updated_at = ahora();

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async desactivarExtra(extraId) {
    const actual = await this.obtener(extraId);
    if (!actual) throw new NoEncontradoError('Extra', extraId);

    const actualizado = { ...actual, activo: false, updated_at: ahora() };

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async reordenarExtras(ordenFinal) {
    if (!Array.isArray(ordenFinal)) {
      throw new ValidacionError('ordenFinal debe ser un array');
    }

    await this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const todos = req.result;
        const mapa = new Map(todos.map((e) => [e.id, e]));

        if (ordenFinal.length !== todos.length) { tx.abort(); return; }
        const ids = new Set();
        for (const entrada of ordenFinal) {
          if (!entrada || typeof entrada.id !== 'string') { tx.abort(); return; }
          if (!mapa.has(entrada.id)) { tx.abort(); return; }
          if (ids.has(entrada.id)) { tx.abort(); return; }
          ids.add(entrada.id);
        }

        const ts = ahora();
        for (let i = 0; i < ordenFinal.length; i++) {
          const original = mapa.get(ordenFinal[i].id);
          this.insertarOActualizar(tx, {
            ...original,
            orden_catalogo: i + 1,
            updated_at: ts
          });
        }

        resolver(true);
      };
      req.onerror = () => tx.abort();
    });
  }

  _comparar(a, b) {
    const oa = a.orden_catalogo ?? Infinity;
    const ob = b.orden_catalogo ?? Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  }
}
