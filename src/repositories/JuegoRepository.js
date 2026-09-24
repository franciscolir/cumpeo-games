/* =============================================================
   JuegoRepository — catálogo de tipos de juego.
   Reglas:
   - codigo único e inmutable tras creación.
   - Sin versionado, sin lease, sin action_id.
   - Filtro de "activo" en memoria (IndexedDB no indexa booleanos).
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  YaExisteError,
  NoEncontradoError,
  ValidacionError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'juegos';

export class JuegoRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  async obtenerJuego(juegoId) {
    return this.obtener(juegoId);
  }

  async obtenerJuegoPorCodigo(codigo) {
    validarNoVacio(codigo, 'codigo');

    if (this.modo === 'supabase') {
      const filas = await this.adapter.query(this.storeName, {
        eq: { codigo },
        single: true
      });
      return filas || null;
    }

    const lista = await this.listarPorIndice('juego_codigo', codigo);
    return lista[0] || null;
  }

  async listarJuegos({ incluirInactivos = false } = {}) {
    const todos = await this.listar();
    const filtrados = incluirInactivos ? todos : todos.filter((j) => j.activo === true);
    return filtrados.sort((a, b) => this._comparar(a, b));
  }

  async crearJuego({
    codigo,
    nombre,
    descripcion = null,
    requiere_set = false,
    orden_catalogo = null,
    configuracion = {}
  }) {
    validarNoVacio(codigo, 'codigo');
    validarNoVacio(nombre, 'nombre');

    const ts = ahora();
    const juego = {
      id: nuevoId(),
      codigo,
      nombre,
      descripcion,
      requiere_set: Boolean(requiere_set),
      orden_catalogo,
      configuracion,
      activo: true,
      created_at: ts,
      updated_at: ts
    };

    if (this.modo === 'supabase') {
      const existente = await this.obtenerJuegoPorCodigo(codigo);
      if (existente) throw new YaExisteError('Juego', codigo);
      return this.agregarRegistro(juego);
    }

    let errorInterno = null;

    await this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const indice = store.index('juego_codigo');
      const req = indice.get(codigo);

      req.onsuccess = () => {
        if (req.result) {
          errorInterno = new YaExisteError('Juego', codigo);
          resolver(null);
          return;
        }

        try {
          this.agregar(tx, juego);
          resolver(juego);
        } catch (error) {
          errorInterno = error;
          resolver(null);
        }
      };

      req.onerror = () => {
        errorInterno = req.error;
        resolver(null);
      };
    });

    if (errorInterno) {
      throw errorInterno;
    }

    return juego;
  }

  async actualizarJuego(juegoId, cambios) {
    const actual = await this.obtener(juegoId);
    if (!actual) throw new NoEncontradoError('Juego', juegoId);

    if (Object.prototype.hasOwnProperty.call(cambios, 'configuracion')) {
      const cfg = cambios.configuracion;
      if (cfg !== null && (typeof cfg !== 'object' || Array.isArray(cfg))) {
        throw new ValidacionError('configuracion debe ser un objeto', { campo: 'configuracion' });
      }
    }

    const permitidos = ['nombre', 'descripcion', 'orden_catalogo', 'configuracion'];
    const actualizado = { ...actual };

    for (const campo of permitidos) {
      if (Object.prototype.hasOwnProperty.call(cambios, campo)) {
        actualizado[campo] = cambios[campo];
      }
    }

    if (Object.prototype.hasOwnProperty.call(cambios, 'codigo') &&
        cambios.codigo !== actual.codigo) {
      throw new ValidacionError('El código del juego es inmutable', { campo: 'codigo' });
    }

    if (Object.prototype.hasOwnProperty.call(cambios, 'requiere_set') &&
        cambios.requiere_set !== actual.requiere_set) {
      throw new ValidacionError('requiere_set del juego es inmutable', { campo: 'requiere_set' });
    }

    if (actualizado.nombre != null) validarNoVacio(actualizado.nombre, 'nombre');

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

  async obtenerConfiguracion(juegoId) {
    const juego = await this.obtener(juegoId);
    if (!juego) return null;
    return juego.configuracion || {};
  }

  async actualizarConfiguracion(juegoId, config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new ValidacionError('configuracion debe ser un objeto', { campo: 'configuracion' });
    }

    const juego = await this.obtener(juegoId);
    if (!juego) throw new NoEncontradoError('Juego', juegoId);

    const actualizado = { ...juego, configuracion: config, updated_at: ahora() };

    if (this.modo === 'supabase') {
      await this.actualizarRegistro(actualizado);
      return actualizado;
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async desactivarJuego(juegoId) {
    const actual = await this.obtener(juegoId);
    if (!actual) throw new NoEncontradoError('Juego', juegoId);

    const actualizado = { ...actual, activo: false, updated_at: ahora() };

    if (this.modo === 'supabase') {
      await this.actualizarRegistro(actualizado);
      return actualizado;
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async reordenarJuegos(ordenFinal) {
    if (!Array.isArray(ordenFinal)) {
      throw new ValidacionError('ordenFinal debe ser un array');
    }

    if (this.modo === 'supabase') {
      const todos = await this.listar();
      const mapa = new Map(todos.map((j) => [j.id, j]));

      if (ordenFinal.length !== todos.length) {
        throw new ValidacionError(
          'ordenFinal debe contener todos los juegos exactamente una vez'
        );
      }

      const idsEnviados = new Set();

      for (let i = 0; i < ordenFinal.length; i++) {
        const entrada = ordenFinal[i];

        if (!entrada || typeof entrada.id !== 'string') {
          throw new ValidacionError(`ordenFinal[${i}].id inválido`);
        }

        if (!mapa.has(entrada.id)) {
          throw new ValidacionError(`El juego ${entrada.id} no existe`);
        }

        if (idsEnviados.has(entrada.id)) {
          throw new ValidacionError(`El juego ${entrada.id} está repetido`);
        }

        idsEnviados.add(entrada.id);
      }

      const ts = ahora();

      for (let i = 0; i < ordenFinal.length; i++) {
        const original = mapa.get(ordenFinal[i].id);
        await this.actualizarRegistro({
          ...original,
          orden_catalogo: i + 1,
          updated_at: ts
        });
      }

      return;
    }

    let errorInterno = null;

    await this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const todos = req.result;
        const mapa = new Map(todos.map((j) => [j.id, j]));

        if (ordenFinal.length !== todos.length) {
          errorInterno = new ValidacionError(
            'ordenFinal debe contener todos los juegos exactamente una vez'
          );
          resolver(null);
          return;
        }

        const idsEnviados = new Set();

        for (let i = 0; i < ordenFinal.length; i++) {
          const entrada = ordenFinal[i];

          if (!entrada || typeof entrada.id !== 'string') {
            errorInterno = new ValidacionError(
              `ordenFinal[${i}].id inválido`
            );
            resolver(null);
            return;
          }

          if (!mapa.has(entrada.id)) {
            errorInterno = new ValidacionError(
              `El juego ${entrada.id} no existe`
            );
            resolver(null);
            return;
          }

          if (idsEnviados.has(entrada.id)) {
            errorInterno = new ValidacionError(
              `El juego ${entrada.id} está repetido`
            );
            resolver(null);
            return;
          }

          idsEnviados.add(entrada.id);
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

      req.onerror = () => {
        errorInterno = req.error;
        resolver(null);
      };
    });

    if (errorInterno) {
      throw errorInterno;
    }
  }

  _comparar(a, b) {
    const oa = a.orden_catalogo ?? Infinity;
    const ob = b.orden_catalogo ?? Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  }
}
