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
    const lista = await this.listarPorIndice('juego_codigo', codigo);
    return lista[0] || null;
  }

  async listarJuegos({ incluirInactivos = false } = {}) {
    const todos = await this.listar();
    if (incluirInactivos) {
      return todos.sort((a, b) => this._comparar(a, b));
    }
    return todos
      .filter((j) => j.activo === true)
      .sort((a, b) => this._comparar(a, b));
  }

  async crearJuego({ codigo, nombre, descripcion = null, requiere_set = false, orden_catalogo = null }) {
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
      activo: true,
      created_at: ts,
      updated_at: ts
    };

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

    const permitidos = ['nombre', 'descripcion', 'orden_catalogo'];
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

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async desactivarJuego(juegoId) {
    const actual = await this.obtener(juegoId);
    if (!actual) throw new NoEncontradoError('Juego', juegoId);

    const actualizado = { ...actual, activo: false, updated_at: ahora() };

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async reordenarJuegos(ordenFinal) {
    if (!Array.isArray(ordenFinal)) {
      throw new ValidacionError('ordenFinal debe ser un array');
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
