/* =============================================================
   CircuitoRepository — agregado Circuito.
   Contiene: Circuito + CircuitoJuego[] + EquipoCircuito[].

   Reglas:
   - Circuito.version = versión del agregado. Incrementa una sola
     vez por operación lógica, aunque se modifiquen varios hijos.
   - Edición solo si estado = BORRADOR. Si no → CircuitoNoEditableError.
   - Exactamente 2 EquipoCircuito con posiciones 1 y 2.
   - Órdenes de CircuitoJuego: 1..N sin gaps.
   - Reemplazo de hijos al actualizar (en BORRADOR no hay consumidores
     externos, por lo que regenerar IDs es seguro).
   - Eliminar: rechaza si hay Partida EN_CURSO. Cascada manual.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  ConflictoVersionError,
  CircuitoNoEditableError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE_CIRCUITOS = 'circuitos';
const STORE_JUEGOS = 'circuito_juegos';
const STORE_EQUIPOS = 'equipo_circuitos';
const STORE_PARTIDAS = 'partidas';

const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class CircuitoRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE_CIRCUITOS);
  }

  /**
   * Obtiene un circuito por su id.
   *
   * @param {string} circuitoId - ID del circuito.
   * @returns {Promise<object|null>} El circuito o null.
   */
  async obtenerCircuito(circuitoId) {
    return this.obtener(circuitoId);
  }

  /**
   * Lista circuitos, opcionalmente filtrando plantillas.
   *
   * @param {object} opciones - Opciones de filtrado.
   * @param {boolean} opciones.incluirPlantillas - Si es false, excluye plantillas.
   * @returns {Promise<Array>} Lista de circuitos.
   */
  async listarCircuitos({ incluirPlantillas = true } = {}) {
    const todos = await this.listar();
    const filtrados = incluirPlantillas ? todos : todos.filter((c) => !c.es_plantilla);
    return filtrados.sort((a, b) => this._comparar(a, b));
  }

  /**
   * Lista solo circuitos que son plantillas.
   *
   * @returns {Promise<Array>} Lista de plantillas.
   */
  async listarPlantillas() {
    const todos = await this.listar();
    return todos
      .filter((c) => c.es_plantilla === true)
      .sort((a, b) => this._comparar(a, b));
  }

  /**
   * Obtiene un circuito completo con sus juegos y equipos.
   *
   * @param {string} circuitoId - ID del circuito.
   * @returns {Promise<object>} { circuito, juegos, equipos }.
   */
  async obtenerCircuitoCompleto(circuitoId) {
    validarNoVacio(circuitoId, 'circuitoId');

    if (this.modo === 'supabase') {
      const circuito = await this.obtener(circuitoId);
      if (!circuito) return { circuito: null, juegos: [], equipos: [] };

      const juegos = await this.adapter.query(STORE_JUEGOS, {
        eq: { circuito_id: circuitoId }
      });
      juegos.sort((a, b) => a.orden - b.orden);

      const equipos = await this.adapter.query(STORE_EQUIPOS, {
        eq: { circuito_id: circuitoId }
      });
      equipos.sort((a, b) => a.posicion - b.posicion);

      return { circuito, juegos, equipos };
    }

    return this.adapter.tx(
      [STORE_CIRCUITOS, STORE_JUEGOS, STORE_EQUIPOS],
      'readonly',
      (tx, resolver) => {
        const circuitoStore = tx.objectStore(STORE_CIRCUITOS);
        const juegosStore = tx.objectStore(STORE_JUEGOS);
        const equiposStore = tx.objectStore(STORE_EQUIPOS);

        const reqCircuito = circuitoStore.get(circuitoId);
        reqCircuito.onsuccess = () => {
          const circuito = reqCircuito.result;
          if (!circuito) {
            resolver({ circuito: null, juegos: [], equipos: [] });
            return;
          }

          const idxJuegos = juegosStore.index('circuito_juego_circuito_id');
          const reqJuegos = idxJuegos.getAll(circuitoId);
          reqJuegos.onsuccess = () => {
            const juegos = reqJuegos.result.sort((a, b) => a.orden - b.orden);

            const idxEquipos = equiposStore.index('equipo_circuito_circuito_id');
            const reqEquipos = idxEquipos.getAll(circuitoId);
            reqEquipos.onsuccess = () => {
              const equipos = reqEquipos.result.sort((a, b) => a.posicion - b.posicion);
              resolver({ circuito, juegos, equipos });
            };
          };
        };
      }
    );
  }

  /**
   * Crea un circuito completo con juegos y equipos.
   *
   * IMPORTANTE: firma sobrecargada.
   * - Modo Supabase: crearCircuito(payload) usa RPC crear_circuito_completo.
   * - Modo IndexedDB: crearCircuito(payload) usa transacción nativa.
   *
   * @param {object} payload - Datos del circuito.
   * @param {string} payload.nombre - Nombre del circuito.
   * @param {string} [payload.descripcion] - Descripción.
   * @param {Array} payload.juegos - Lista de juegos [{ juego_id, configuracion?, snapshot_id? }].
   * @param {Array} payload.equipos - Lista de equipos [{ posicion, nombre, color }].
   * @returns {Promise<object>} El circuito creado.
   */
  async crearCircuito(payload) {
    this._validarPayload(payload);

    if (this.modo === 'supabase') {
      const actionId = nuevoId();
      const juegos = payload.juegos.map((j, i) => ({
        juego_id: j.juego_id,
        orden: i + 1,
        configuracion: j.configuracion ?? {},
        snapshot_id: j.snapshot_id ?? null
      }));
      const equipos = payload.equipos.map((e) => ({
        posicion: e.posicion,
        nombre: e.nombre,
        color: e.color,
        equipo_guardado_id: e.equipo_guardado_id ?? null
      }));

      const result = await this.adapter.rpc('crear_circuito_completo', {
        p_nombre: payload.nombre,
        p_descripcion: payload.descripcion ?? null,
        p_juegos: juegos,
        p_equipos: equipos,
        p_action_id: actionId
      });

      if (!result.ok) {
        throw new ValidacionError(result.error || 'Error creando circuito');
      }

      return this.obtener(result.circuito_id);
    }

    const ts = ahora();
    const circuitoId = nuevoId();

    const circuito = {
      id: circuitoId,
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? null,
      estado: 'BORRADOR',
      es_plantilla: false,
      version: 1,
      created_at: ts,
      updated_at: ts
    };

    const juegos = payload.juegos.map((j, i) => ({
      id: nuevoId(),
      circuito_id: circuitoId,
      juego_id: j.juego_id,
      orden: i + 1,
      configuracion: j.configuracion ?? {},
      snapshot_id: j.snapshot_id ?? null,
      created_at: ts,
      updated_at: ts
    }));

    const equipos = payload.equipos.map((e) => ({
      id: nuevoId(),
      circuito_id: circuitoId,
      equipo_guardado_id: e.equipo_guardado_id ?? null,
      posicion: e.posicion,
      nombre: e.nombre,
      color: e.color,
      created_at: ts,
      updated_at: ts
    }));

    await this.adapter.tx(
      [STORE_CIRCUITOS, STORE_JUEGOS, STORE_EQUIPOS],
      'readwrite',
      (tx) => {
        tx.objectStore(STORE_CIRCUITOS).add(circuito);
        for (const j of juegos) tx.objectStore(STORE_JUEGOS).add(j);
        for (const e of equipos) tx.objectStore(STORE_EQUIPOS).add(e);
      }
    );

    return circuito;
  }

  /**
   * Actualiza un circuito completo (nombre, estado, juegos, equipos).
   * Solo permite si estado = BORRADOR.
   *
   * @param {string} circuitoId - ID del circuito.
   * @param {number} expectedVersion - Versión esperada para concurrencia.
   * @param {object} payload - Nuevos datos.
   * @returns {Promise<object>} El circuito actualizado.
   */
  async actualizarCircuito(circuitoId, expectedVersion, payload) {
    validarNoVacio(circuitoId, 'circuitoId');

    this._validarPayload(payload);

    const estadoFinal = payload.estado ?? 'BORRADOR';

    if (estadoFinal !== 'BORRADOR' && estadoFinal !== 'LISTO') {
      throw new ValidacionError(`estado inválido: ${estadoFinal}`);
    }

    const esPlantillaFinal =
      payload.es_plantilla != null
        ? Boolean(payload.es_plantilla)
        : false;

    if (esPlantillaFinal === true && estadoFinal !== 'LISTO') {
      throw new ValidacionError(
        'es_plantilla=true solo puede coexistir con estado=LISTO'
      );
    }

    if (this.modo === 'supabase') {
      const actual = await this.obtener(circuitoId);
      if (!actual) throw new NoEncontradoError('Circuito', circuitoId);
      if (actual.estado !== 'BORRADOR') throw new CircuitoNoEditableError(circuitoId, actual.estado);
      if (actual.version !== expectedVersion) {
        throw new ConflictoVersionError('Circuito', expectedVersion, actual.version);
      }

      const ts = ahora();

      await this.adapter.update(STORE_CIRCUITOS, {
        eq: { id: circuitoId }
      }, {
        ...actual,
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
        estado: estadoFinal,
        es_plantilla: esPlantillaFinal,
        version: actual.version + 1,
        updated_at: ts
      });

      await this.adapter.delete(STORE_JUEGOS, { eq: { circuito_id: circuitoId } });
      await this.adapter.delete(STORE_EQUIPOS, { eq: { circuito_id: circuitoId } });

      const juegos = payload.juegos.map((j, i) => ({
        id: nuevoId(),
        circuito_id: circuitoId,
        juego_id: j.juego_id,
        orden: i + 1,
        configuracion: j.configuracion ?? {},
        snapshot_id: j.snapshot_id ?? null,
        created_at: ts,
        updated_at: ts
      }));

      const equipos = payload.equipos.map((e) => ({
        id: nuevoId(),
        circuito_id: circuitoId,
        equipo_guardado_id: e.equipo_guardado_id ?? null,
        posicion: e.posicion,
        nombre: e.nombre,
        color: e.color,
        created_at: ts,
        updated_at: ts
      }));

      await this.adapter.insert(STORE_JUEGOS, juegos);
      await this.adapter.insert(STORE_EQUIPOS, equipos);

      return this.obtener(circuitoId);
    }

    const ts = ahora();

    let circuitoActualizado = null;
    let errorInterno = null;

    await this.adapter.tx(
      [STORE_CIRCUITOS, STORE_JUEGOS, STORE_EQUIPOS],
      'readwrite',
      (tx, resolver) => {
        const circuitosStore = tx.objectStore(STORE_CIRCUITOS);
        const juegosStore = tx.objectStore(STORE_JUEGOS);
        const equiposStore = tx.objectStore(STORE_EQUIPOS);

        const reqCircuito = circuitosStore.get(circuitoId);

        reqCircuito.onsuccess = () => {
          const actual = reqCircuito.result;

          if (!actual) {
            errorInterno = new NoEncontradoError(
              'Circuito',
              circuitoId
            );
            resolver(null);
            return;
          }

          if (actual.estado !== 'BORRADOR') {
            errorInterno = new CircuitoNoEditableError(
              circuitoId,
              actual.estado
            );
            resolver(null);
            return;
          }

          if (actual.version !== expectedVersion) {
            errorInterno = new ConflictoVersionError(
              'Circuito',
              expectedVersion,
              actual.version
            );
            resolver(null);
            return;
          }

          circuitoActualizado = {
            ...actual,
            nombre: payload.nombre,
            descripcion: payload.descripcion ?? null,
            estado: estadoFinal,
            es_plantilla: esPlantillaFinal,
            version: actual.version + 1,
            updated_at: ts
          };

          const juegos = payload.juegos.map((j, i) => ({
            id: nuevoId(),
            circuito_id: circuitoId,
            juego_id: j.juego_id,
            orden: i + 1,
            configuracion: j.configuracion ?? {},
            snapshot_id: j.snapshot_id ?? null,
            created_at: ts,
            updated_at: ts
          }));

          const equipos = payload.equipos.map((e) => ({
            id: nuevoId(),
            circuito_id: circuitoId,
            equipo_guardado_id: e.equipo_guardado_id ?? null,
            posicion: e.posicion,
            nombre: e.nombre,
            color: e.color,
            created_at: ts,
            updated_at: ts
          }));

          const idxJuegos =
            juegosStore.index('circuito_juego_circuito_id');

          const reqJuegosActuales =
            idxJuegos.getAllKeys(circuitoId);

          reqJuegosActuales.onsuccess = () => {
            for (const key of reqJuegosActuales.result) {
              juegosStore.delete(key);
            }

            const idxEquipos =
              equiposStore.index('equipo_circuito_circuito_id');

            const reqEquiposActuales =
              idxEquipos.getAllKeys(circuitoId);

            reqEquiposActuales.onsuccess = () => {
              for (const key of reqEquiposActuales.result) {
                equiposStore.delete(key);
              }

              for (const j of juegos) {
                juegosStore.add(j);
              }

              for (const e of equipos) {
                equiposStore.add(e);
              }

              circuitosStore.put(circuitoActualizado);
            };

            reqEquiposActuales.onerror = () => {
              errorInterno = reqEquiposActuales.error;
              resolver(null);
            };
          };

          reqJuegosActuales.onerror = () => {
            errorInterno = reqJuegosActuales.error;
            resolver(null);
          };
        };

        reqCircuito.onerror = () => {
          errorInterno = reqCircuito.error;
          resolver(null);
        };
      }
    );

    if (errorInterno) {
      throw errorInterno;
    }

    return circuitoActualizado;
  }

  /**
   * Elimina un circuito y sus hijos.
   * Rechaza si hay partidas en curso.
   *
   * @param {string} circuitoId - ID del circuito.
   * @returns {Promise<boolean>} true si se eliminó.
   */
  async eliminarCircuito(circuitoId) {
    validarNoVacio(circuitoId, 'circuitoId');

    if (this.modo === 'supabase') {
      const actual = await this.obtener(circuitoId);
      if (!actual) throw new NoEncontradoError('Circuito', circuitoId);

      const partidas = await this.adapter.query(STORE_PARTIDAS, {
        eq: { circuito_id: circuitoId }
      });
      const hayEnCurso = partidas.some((p) => p.estado === 'EN_CURSO');
      if (hayEnCurso) {
        throw new ValidacionError('No se puede eliminar un circuito con partidas en curso');
      }

      await this.adapter.delete(STORE_JUEGOS, { eq: { circuito_id: circuitoId } });
      await this.adapter.delete(STORE_EQUIPOS, { eq: { circuito_id: circuitoId } });
      await this.eliminarRegistro(circuitoId);

      return true;
    }

    const actual = await this.obtener(circuitoId);
    if (!actual) throw new NoEncontradoError('Circuito', circuitoId);

    await this.adapter.tx(
      [STORE_CIRCUITOS, STORE_JUEGOS, STORE_EQUIPOS, STORE_PARTIDAS],
      'readwrite',
      (tx, resolver) => {
        const partidasStore = tx.objectStore(STORE_PARTIDAS);
        const idxPartidas = partidasStore.index('partida_circuito_id');
        const reqPartidas = idxPartidas.getAll(circuitoId);

        reqPartidas.onsuccess = () => {
          const partidas = reqPartidas.result;
          const hayEnCurso = partidas.some((p) => p.estado === 'EN_CURSO');
          if (hayEnCurso) {
            tx.abort();
            return;
          }

          const juegosStore = tx.objectStore(STORE_JUEGOS);
          const idxJuegos = juegosStore.index('circuito_juego_circuito_id');
          const reqJuegos = idxJuegos.getAllKeys(circuitoId);
          reqJuegos.onsuccess = () => {
            for (const key of reqJuegos.result) juegosStore.delete(key);

            const equiposStore = tx.objectStore(STORE_EQUIPOS);
            const idxEquipos = equiposStore.index('equipo_circuito_circuito_id');
            const reqEquipos = idxEquipos.getAllKeys(circuitoId);
            reqEquipos.onsuccess = () => {
              for (const key of reqEquipos.result) equiposStore.delete(key);
              tx.objectStore(STORE_CIRCUITOS).delete(circuitoId);
              resolver(true);
            };
          };
        };
      }
    );
  }

  _validarPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new ValidacionError('payload inválido');
    }

    validarNoVacio(payload.nombre, 'nombre');

    if (!Array.isArray(payload.juegos) || payload.juegos.length === 0) {
      throw new ValidacionError('Se requiere al menos 1 juego en el circuito');
    }

    for (let i = 0; i < payload.juegos.length; i++) {
      const j = payload.juegos[i];
      if (!j || typeof j.juego_id !== 'string' || j.juego_id.trim() === '') {
        throw new ValidacionError(`juegos[${i}].juego_id inválido`);
      }
    }

    if (!Array.isArray(payload.equipos) || payload.equipos.length !== 2) {
      throw new ValidacionError('Se requieren exactamente 2 equipos');
    }

    const posiciones = new Set();
    for (let i = 0; i < payload.equipos.length; i++) {
      const e = payload.equipos[i];
      if (!e || (e.posicion !== 1 && e.posicion !== 2)) {
        throw new ValidacionError(`equipos[${i}].posicion debe ser 1 o 2`);
      }
      if (posiciones.has(e.posicion)) {
        throw new ValidacionError('posiciones duplicadas en equipos');
      }
      posiciones.add(e.posicion);

      validarNoVacio(e.nombre, `equipos[${i}].nombre`);
      validarNoVacio(e.color, `equipos[${i}].color`);
      if (!COLOR_REGEX.test(e.color)) {
        throw new ValidacionError(`equipos[${i}].color: se espera #RRGGBB`);
      }
    }
  }

  _comparar(a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), 'es');
  }
}
