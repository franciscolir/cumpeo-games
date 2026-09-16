/* =============================================================
   PartidaRepository — agregado Partida + JuegoEjecutado + EquipoPartida.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { AccionProcesadaRepository } from './AccionProcesadaRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  ConflictoVersionError,
  SinControlError,
  OperacionInvalidaError,
  PublicCodigoDuplicadoError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';
import { TIPO_ACCION } from '../services/acciones.js';

const STORE_PARTIDAS = 'partidas';
const STORE_JUEGOS_EJECUTADOS = 'juego_ejecutados';
const STORE_EQUIPOS_PARTIDA = 'equipo_partidas';
const STORE_PARTICIPANTES = 'participante_partidas';
const STORE_CONTROL = 'control_partidas';
const STORE_CIRCUITO_JUEGOS = 'circuito_juegos';
const STORE_EQUIPO_CIRCUITOS = 'equipo_circuitos';
const STORE_CIRCUITOS = 'circuitos';
const STORE_ACCIONES = 'accion_procesadas';

export class PartidaRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE_PARTIDAS);
    this.acciones = new AccionProcesadaRepository(adapter);
  }

  async obtenerPartida(partidaId) {
    return this.obtener(partidaId);
  }

  async obtenerPartidaPorCodigo(publicCodigo) {
    validarNoVacio(publicCodigo, 'publicCodigo');
    const lista = await this.listarPorIndice('partida_public_codigo', publicCodigo);
    return lista[0] || null;
  }

  async listarPartidasPorEstado(estado) {
    validarNoVacio(estado, 'estado');
    return this.listarPorIndice('partida_estado', estado);
  }

  async listarPartidasEnCurso() {
    return this.listarPartidasPorEstado('EN_CURSO');
  }


  async listarPartidasExpirables() {
    const limite = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    return this.adapter.tx(
      [STORE_PARTIDAS],
      'readonly',
      (tx, resolver) => {
        const store = tx.objectStore(STORE_PARTIDAS);
        const indice = store.index(
          'partida_estado_last_activity_at'
        );

        const rango = IDBKeyRange.bound(
          ['EN_CURSO', ''],
          ['EN_CURSO', limite]
        );

        const req = indice.getAll(rango);

        req.onsuccess = () => {
          resolver(req.result || []);
        };

        req.onerror = () => {
          tx.abort();
        };
      }
    );
  }

  async listarPartidasRecuperables() {
    const enCurso = await this.listarPartidasPorEstado('EN_CURSO');
    const configurando = await this.listarPartidasPorEstado('CONFIGURANDO');
    return [...configurando, ...enCurso];
  }

  async obtenerContextoEspera(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    return this.adapter.tx(
      [
        STORE_PARTIDAS,
        STORE_EQUIPOS_PARTIDA,
        STORE_PARTICIPANTES,
        STORE_JUEGOS_EJECUTADOS
      ],
      'readonly',
      (tx, resolver) => {
        const partidasStore = tx.objectStore(STORE_PARTIDAS);
        const reqPartida = partidasStore.get(partidaId);

        reqPartida.onsuccess = () => {
          const partida = reqPartida.result;
          if (!partida) {
            resolver({ partida: null, equipos: [], participantes: [], juegos: [] });
            return;
          }

          const equiposStore = tx.objectStore(STORE_EQUIPOS_PARTIDA);
          const reqEquipos = equiposStore.index('equipo_partida_partida_id').getAll(partidaId);

          reqEquipos.onsuccess = () => {
            const equipos = reqEquipos.result.sort((a, b) => a.posicion - b.posicion);

            const partStore = tx.objectStore(STORE_PARTICIPANTES);
            const reqParts = partStore.index('participante_partida_partida_id').getAll(partidaId);

            reqParts.onsuccess = () => {
              const participantes = reqParts.result;

              const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
              const reqJuegos = jeStore
                .index('juego_ejecutado_partida_id')
                .getAll(partidaId);

              reqJuegos.onsuccess = () => {
                const juegos = reqJuegos.result.sort((a, b) => a.orden - b.orden);
                resolver({ partida, equipos, participantes, juegos });
              };

              reqJuegos.onerror = () => tx.abort();
            };

            reqParts.onerror = () => tx.abort();
          };

          reqEquipos.onerror = () => tx.abort();
        };

        reqPartida.onerror = () => tx.abort();
      }
    );
  }

  async crearPartida({ circuito_id, public_codigo, actionId }) {
    validarNoVacio(circuito_id, 'circuito_id');
    validarNoVacio(public_codigo, 'public_codigo');
    validarNoVacio(actionId, 'actionId');

    return this.adapter.tx(
      [
        STORE_PARTIDAS,
        STORE_CONTROL,
        STORE_EQUIPOS_PARTIDA,
        STORE_CIRCUITOS,
        STORE_EQUIPO_CIRCUITOS,
        STORE_ACCIONES
      ],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(
          tx,
          actionId,
          null,
          TIPO_ACCION.CREAR_PARTIDA,
          (reserva) => {
            if (reserva.yaProcesada) {
              resolver({ partida: reserva.resultado });
              return;
            }

            this._crearPartidaEnTx(tx, circuito_id, public_codigo, (resultado) => {
              if (resultado.error) {
                resolver({ error: resultado.error });
                return;
              }

              this.acciones.actualizarResultadoEnTx(tx, actionId, resultado.partida);
              resolver({ partida: resultado.partida });
            });
          }
        );
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.partida;
    });
  }

  _crearPartidaEnTx(tx, circuito_id, public_codigo, onDone) {
    const partidasStore = tx.objectStore(STORE_PARTIDAS);
    const idxCodigo = partidasStore.index('partida_public_codigo');
    const reqCodigo = idxCodigo.get(public_codigo);

    reqCodigo.onsuccess = () => {
      if (reqCodigo.result) {
        onDone({ error: new PublicCodigoDuplicadoError(public_codigo) });
        return;
      }

      const circStore = tx.objectStore(STORE_CIRCUITOS);
      const reqCirc = circStore.get(circuito_id);

      reqCirc.onsuccess = () => {
        const circuito = reqCirc.result;
        if (!circuito) {
          onDone({ error: new NoEncontradoError('Circuito', circuito_id) });
          return;
        }
        if (circuito.estado !== 'LISTO') {
          onDone({ error: new OperacionInvalidaError(
            'El circuito no está LISTO (estado actual: ' + circuito.estado + ')'
          ) });
          return;
        }

        const eqCircStore = tx.objectStore(STORE_EQUIPO_CIRCUITOS);
        const reqEquipos = eqCircStore
          .index('equipo_circuito_circuito_id')
          .getAll(circuito_id);

        reqEquipos.onsuccess = () => {
          const equiposCirc = reqEquipos.result.sort((a, b) => a.posicion - b.posicion);
          if (equiposCirc.length !== 2) {
            onDone({ error: new OperacionInvalidaError(
              'El circuito debe tener exactamente 2 equipos (tiene ' + equiposCirc.length + ')'
            ) });
            return;
          }

          const ts = ahora();
          const partidaId = nuevoId();

          const partida = {
            id: partidaId,
            circuito_id,
            circuito_nombre: circuito.nombre,
            public_codigo,
            estado: 'CONFIGURANDO',
            version: 1,
            started_at: null,
            finished_at: null,
            finish_reason: null,
            last_activity_at: ts,
            created_at: ts,
            updated_at: ts
          };
          partidasStore.add(partida);

          tx.objectStore(STORE_CONTROL).add({
            partida_id: partidaId,
            session_id: null,
            usuario_id: null,
            acquired_at: null,
            expires_at: null,
            heartbeat_at: null
          });

          const eqPartStore = tx.objectStore(STORE_EQUIPOS_PARTIDA);
          for (const ec of equiposCirc) {
            eqPartStore.add({
              id: nuevoId(),
              partida_id: partidaId,
              equipo_circuito_id: ec.id,
              posicion: ec.posicion,
              nombre: ec.nombre,
              color: ec.color,
              puntaje: 0,
              version: 1,
              created_at: ts,
              updated_at: ts
            });
          }

          onDone({ partida });
        };

        reqEquipos.onerror = () => tx.abort();
      };

      reqCirc.onerror = () => tx.abort();
    };

    reqCodigo.onerror = () => tx.abort();
  }
  /**
   * Helper interno transaccional para comenzarPartida.
   * Extraído para permitir idempotencia vía reservarEnTx.
   *
   * @param {IDBTransaction} tx - Transacción abierta con STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS,
   *   STORE_CIRCUITO_JUEGOS, STORE_CONTROL
   * @param {string} partidaId - ID de la partida a comenzar
   * @param {string} sessionId - Sesión del conductor (lease check)
   * @param {function} onDone - Callback con resultado { partidaId, juegos } o { error }
   */
  _comenzarPartidaEnTx(tx, partidaId, sessionId, onDone) {
    this._verificarLeaseEnTx(tx, partidaId, sessionId, (ok) => {
      if (!ok) {
        onDone({ error: new SinControlError(partidaId) });
        return;
      }

      const partidasStore = tx.objectStore(STORE_PARTIDAS);
      const reqPartida = partidasStore.get(partidaId);

      reqPartida.onsuccess = () => {
        const partida = reqPartida.result;
        if (!partida) {
          onDone({ error: new NoEncontradoError('Partida', partidaId) });
          return;
        }
        if (partida.estado !== 'CONFIGURANDO') {
          onDone({ error: new OperacionInvalidaError(
            'No se puede comenzar una partida en estado ' + partida.estado
          ) });
          return;
        }
        if (!partida.circuito_id) {
          onDone({ error: new OperacionInvalidaError('La partida no tiene circuito_id') });
          return;
        }

        const cjStore = tx.objectStore(STORE_CIRCUITO_JUEGOS);
        const reqCjs = cjStore
          .index('circuito_juego_circuito_id')
          .getAll(partida.circuito_id);

        reqCjs.onsuccess = () => {
          const cjs = reqCjs.result.sort((a, b) => a.orden - b.orden);
          if (cjs.length === 0) {
            onDone({ error: new OperacionInvalidaError(
              'El circuito de la partida no tiene juegos'
            ) });
            return;
          }

          const ts = ahora();
          const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
          const juegosCreados = [];

          for (const cj of cjs) {
            const je = {
              id: nuevoId(),
              partida_id: partidaId,
              circuito_juego_id: cj.id,
              juego_id: cj.juego_id,
              orden: cj.orden,
              snapshot_id: cj.snapshot_id ?? null,
              configuracion_congelada: cj.configuracion ?? {},
              estado: 'PENDIENTE',
              state_version: 1,
              timer_actual: null,
              paused_at: null,
              estado_juego: {},
              resultado: null,
              finish_reason: null,
              started_at: null,
              finished_at: null,
              created_at: ts,
              updated_at: ts
            };
            jeStore.add(je);
            juegosCreados.push(je);
          }

          partidasStore.put({
            ...partida,
            estado: 'EN_CURSO',
            started_at: ts,
            last_activity_at: ts,
            version: partida.version + 1,
            updated_at: ts
          });

          onDone({ partidaId, juegos: juegosCreados });
        };

        reqCjs.onerror = () => tx.abort();
      };

      reqPartida.onerror = () => tx.abort();
    });
  }

  async comenzarPartida(partidaId, sessionId, actionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');

    return this.adapter.tx(
      [
        STORE_PARTIDAS,
        STORE_JUEGOS_EJECUTADOS,
        STORE_CIRCUITO_JUEGOS,
        STORE_CONTROL,
        STORE_ACCIONES
      ],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, TIPO_ACCION.COMENZAR_PARTIDA, (reserva) => {
          if (reserva.yaProcesada) {
            resolver({ partidaId, juegos: reserva.resultado });
            return;
          }

          this._comenzarPartidaEnTx(tx, partidaId, sessionId, (resultado) => {
            if (resultado.error) {
              resolver({ error: resultado.error });
              return;
            }
            this.acciones.actualizarResultadoEnTx(tx, actionId, resultado.juegos);
            resolver({ partidaId: resultado.partidaId, juegos: resultado.juegos });
          });
        });
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r;
    });
  }

  async iniciarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');

    return this.adapter.tx(
      [STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS, STORE_CONTROL, STORE_ACCIONES],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, TIPO_ACCION.INICIAR_JUEGO, (reserva) => {
          if (reserva.yaProcesada) {
            resolver({ juegoEjecutado: reserva.resultado });
            return;
          }

          this._iniciarJuegoEnTx(tx, partidaId, juegoEjecutadoId, sessionId, (resultado) => {
            if (resultado.error) {
              resolver({ error: resultado.error });
              return;
            }
            this.acciones.actualizarResultadoEnTx(tx, actionId, resultado.juegoEjecutado);
            resolver({ juegoEjecutado: resultado.juegoEjecutado });
          });
        });
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.juegoEjecutado;
    });
  }

  _iniciarJuegoEnTx(tx, partidaId, juegoEjecutadoId, sessionId, onDone) {
    this._verificarLeaseEnTx(tx, partidaId, sessionId, (ok) => {
      if (!ok) {
        onDone({ error: new SinControlError(partidaId) });
        return;
      }

      const partidasStore = tx.objectStore(STORE_PARTIDAS);
      const reqPartida = partidasStore.get(partidaId);

      reqPartida.onsuccess = () => {
        const partida = reqPartida.result;
        if (!partida) {
          onDone({ error: new NoEncontradoError('Partida', partidaId) });
          return;
        }
        if (partida.estado !== 'EN_CURSO') {
          onDone({ error: new OperacionInvalidaError('La partida no está EN_CURSO') });
          return;
        }

        const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
        const reqJe = jeStore.get(juegoEjecutadoId);

        reqJe.onsuccess = () => {
          const je = reqJe.result;
          if (!je || je.partida_id !== partidaId) {
            onDone({ error: new NoEncontradoError('JuegoEjecutado', juegoEjecutadoId) });
            return;
          }
          if (je.estado !== 'PENDIENTE') {
            onDone({ error: new OperacionInvalidaError(
              'No se puede iniciar un juego en estado ' + je.estado
            ) });
            return;
          }

          const idxActivo = jeStore.index('juego_ejecutado_partida_id');
          const reqActivo = idxActivo.getAll(partidaId);

          reqActivo.onsuccess = () => {
            const activos = reqActivo.result.filter(
              (j) => j.estado === 'EN_CURSO' || j.estado === 'PAUSADO'
            );
            if (activos.length > 0) {
              onDone({ error: new OperacionInvalidaError(
                'Ya existe un juego activo en esta partida (INV-055)'
              ) });
              return;
            }

            const ts = ahora();
            const actualizado = {
              ...je,
              estado: 'EN_CURSO',
              started_at: ts,
              state_version: je.state_version + 1,
              updated_at: ts
            };
            jeStore.put(actualizado);

            partidasStore.put({
              ...partida,
              last_activity_at: ts,
              version: partida.version + 1,
              updated_at: ts
            });

            onDone({ juegoEjecutado: actualizado });
          };

          reqActivo.onerror = () => tx.abort();
        };

        reqJe.onerror = () => tx.abort();
      };

      reqPartida.onerror = () => tx.abort();
    });
  }

  /**
   * Helper interno transaccional para actualizarEstadoJuego.
   * Extraído para permitir idempotencia vía reservarEnTx.
   *
   * @param {IDBTransaction} tx - Transacción abierta con STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS, STORE_CONTROL
   * @param {string} partidaId - ID de la partida
   * @param {string} juegoEjecutadoId - ID del juego ejecutado
   * @param {object} estadoJuego - Nuevo estado del juego
   * @param {number} expectedStateVersion - Versión esperada para detectar conflictos
   * @param {string} sessionId - Sesión del conductor (lease check)
   * @param {function} onDone - Callback con resultado { juegoEjecutado } o { error }
   */
  _actualizarEstadoJuegoEnTx(tx, partidaId, juegoEjecutadoId, estadoJuego, expectedStateVersion, sessionId, onDone) {
    this._verificarLeaseEnTx(tx, partidaId, sessionId, (ok) => {
      if (!ok) {
        onDone({ error: new SinControlError(partidaId) });
        return;
      }

      const partidasStore = tx.objectStore(STORE_PARTIDAS);
      const reqPartida = partidasStore.get(partidaId);

      reqPartida.onsuccess = () => {
        const partida = reqPartida.result;
        if (!partida) {
          onDone({ error: new NoEncontradoError('Partida', partidaId) });
          return;
        }

        if (partida.estado !== 'EN_CURSO') {
          onDone({
            error: new OperacionInvalidaError(
              'La partida no está EN_CURSO'
            )
          });
          return;
        }

        const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
        const reqJe = jeStore.get(juegoEjecutadoId);

        reqJe.onsuccess = () => {
          const je = reqJe.result;
          if (!je || je.partida_id !== partidaId) {
            onDone({ error: new NoEncontradoError('JuegoEjecutado', juegoEjecutadoId) });
            return;
          }
          if (je.estado !== 'EN_CURSO') {
            onDone({ error: new OperacionInvalidaError('El juego no está EN_CURSO') });
            return;
          }
          if (je.state_version !== expectedStateVersion) {
            onDone({ error: new ConflictoVersionError(
              'JuegoEjecutado', expectedStateVersion, je.state_version
            ) });
            return;
          }

          const ts = ahora();
          const actualizado = {
            ...je,
            estado_juego: estadoJuego,
            state_version: je.state_version + 1,
            updated_at: ts
          };
          jeStore.put(actualizado);

          partidasStore.put({
            ...partida,
            last_activity_at: ts,
            version: partida.version + 1,
            updated_at: ts
          });

          onDone({ juegoEjecutado: actualizado });
        };

        reqJe.onerror = () => tx.abort();
      };

      reqPartida.onerror = () => tx.abort();
    });
  }

  async actualizarEstadoJuego(partidaId, juegoEjecutadoId, estadoJuego, expectedStateVersion, sessionId, actionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');
    if (!estadoJuego || typeof estadoJuego !== 'object') {
      throw new ValidacionError('estadoJuego debe ser un objeto');
    }

    return this.adapter.tx(
      [STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS, STORE_CONTROL, STORE_ACCIONES],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, TIPO_ACCION.ACTUALIZAR_ESTADO_JUEGO, (reserva) => {
          if (reserva.yaProcesada) {
            resolver({ juegoEjecutado: reserva.resultado });
            return;
          }

          this._actualizarEstadoJuegoEnTx(tx, partidaId, juegoEjecutadoId, estadoJuego, expectedStateVersion, sessionId, (resultado) => {
            if (resultado.error) {
              resolver({ error: resultado.error });
              return;
            }
            this.acciones.actualizarResultadoEnTx(tx, actionId, resultado.juegoEjecutado);
            resolver({ juegoEjecutado: resultado.juegoEjecutado });
          });
        });
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.juegoEjecutado;
    });
  }

  async pausarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    return this._cambiarEstadoJuego(
      partidaId, juegoEjecutadoId, sessionId, actionId,
      TIPO_ACCION.PAUSAR_JUEGO,
      'EN_CURSO', 'PAUSADO',
      (je, ts) => ({ ...je, paused_at: ts })
    );
  }

  async reanudarJuego(partidaId, juegoEjecutadoId, sessionId, actionId) {
    return this._cambiarEstadoJuego(
      partidaId, juegoEjecutadoId, sessionId, actionId,
      TIPO_ACCION.REANUDAR_JUEGO,
      'PAUSADO', 'EN_CURSO',
      (je) => ({ ...je, paused_at: null })
    );
  }

  async _cambiarEstadoJuego(partidaId, juegoEjecutadoId, sessionId, actionId, tipoAccion, estadoEsperado, nuevoEstado, mutador) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');
    validarNoVacio(tipoAccion, 'tipoAccion');

    return this.adapter.tx(
      [STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS, STORE_CONTROL, STORE_ACCIONES],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, tipoAccion, (reserva) => {
          if (reserva.yaProcesada) {
            resolver({ juegoEjecutado: reserva.resultado });
            return;
          }

          this._cambiarEstadoJuegoEnTx(
            tx,
            partidaId, juegoEjecutadoId, sessionId,
            estadoEsperado, nuevoEstado, mutador,
            (resultado) => {
              if (resultado.error) {
                resolver({ error: resultado.error });
                return;
              }
              this.acciones.actualizarResultadoEnTx(tx, actionId, resultado.juegoEjecutado);
              resolver({ juegoEjecutado: resultado.juegoEjecutado });
            }
          );
        });
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.juegoEjecutado;
    });
  }

  /* =============================================================
     Interno — trabajo real de _cambiarEstadoJuego dentro de la tx.
     ============================================================= */
  _cambiarEstadoJuegoEnTx(tx, partidaId, juegoEjecutadoId, sessionId, estadoEsperado, nuevoEstado, mutador, onDone) {
    this._verificarLeaseEnTx(tx, partidaId, sessionId, (ok) => {
      if (!ok) {
        onDone({ error: new SinControlError(partidaId) });
        return;
      }

      const partidasStore = tx.objectStore(STORE_PARTIDAS);
      const reqPartida = partidasStore.get(partidaId);

      reqPartida.onsuccess = () => {
        const partida = reqPartida.result;
        if (!partida) {
          onDone({ error: new NoEncontradoError('Partida', partidaId) });
          return;
        }

        if (partida.estado !== 'EN_CURSO') {
          onDone({ error: new OperacionInvalidaError('Partida no está EN_CURSO') });
          return;
        }

        const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
        const reqJe = jeStore.get(juegoEjecutadoId);

        reqJe.onsuccess = () => {
          const je = reqJe.result;
          if (!je || je.partida_id !== partidaId) {
            onDone({ error: new NoEncontradoError('JuegoEjecutado', juegoEjecutadoId) });
            return;
          }
          if (je.estado !== estadoEsperado) {
            onDone({ error: new OperacionInvalidaError(
              'Transición inválida: se esperaba ' + estadoEsperado + ', actual ' + je.estado
            ) });
            return;
          }

          const ts = ahora();
          const mutado = mutador(je, ts);
          const actualizado = {
            ...mutado,
            estado: nuevoEstado,
            state_version: je.state_version + 1,
            updated_at: ts
          };
          jeStore.put(actualizado);

          partidasStore.put({
            ...partida,
            last_activity_at: ts,
            version: partida.version + 1,
            updated_at: ts
          });

          onDone({ juegoEjecutado: actualizado });
        };

        reqJe.onerror = () => tx.abort();
      };

      reqPartida.onerror = () => tx.abort();
    });
  }

  /**
   * Helper interno transaccional para finalizarJuego.
   * Extraído para permitir idempotencia vía reservarEnTx.
   *
   * @param {IDBTransaction} tx - Transacción abierta con STORE_PARTIDAS, STORE_JUEGOS_EJECUTADOS,
   *   STORE_EQUIPOS_PARTIDA, STORE_CONTROL
   * @param {string} partidaId - ID de la partida
   * @param {string} juegoEjecutadoId - ID del juego ejecutado
   * @param {object} resultado - Resultado del juego { puntos_equipo_1, puntos_equipo_2, ... }
   * @param {string} finishReason - Razón de finalización
   * @param {string} sessionId - Sesión del conductor (lease check)
   * @param {function} onDone - Callback con resultado { partida, juegoEjecutado, equipos } o { error }
   */
  _finalizarJuegoEnTx(tx, partidaId, juegoEjecutadoId, resultado, finishReason, sessionId, onDone) {
    const p1 = resultado.puntos_equipo_1;
    const p2 = resultado.puntos_equipo_2;

    this._verificarLeaseEnTx(tx, partidaId, sessionId, (ok) => {
      if (!ok) {
        onDone({ error: new SinControlError(partidaId) });
        return;
      }

      if (
        typeof p1 !== 'number' ||
        !Number.isFinite(p1) ||
        typeof p2 !== 'number' ||
        !Number.isFinite(p2)
      ) {
        onDone({
          error: new ValidacionError(
            'Los puntos de ambos equipos deben ser números finitos'
          )
        });
        return;
      }

      const partidasStore = tx.objectStore(STORE_PARTIDAS);
      const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);
      const equiposStore = tx.objectStore(STORE_EQUIPOS_PARTIDA);

      const reqPartida = partidasStore.get(partidaId);

      reqPartida.onsuccess = () => {
        const partida = reqPartida.result;

        if (!partida) {
          onDone({ error: new NoEncontradoError('Partida no encontrada') });
          return;
        }

        if (partida.estado !== 'EN_CURSO') {
          onDone({ error: new OperacionInvalidaError('La partida debe estar EN_CURSO') });
          return;
        }

        const reqJE = jeStore.get(juegoEjecutadoId);

        reqJE.onsuccess = () => {
          const je = reqJE.result;

          if (!je || je.partida_id !== partidaId) {
            onDone({ error: new NoEncontradoError('JuegoEjecutado no encontrado en la partida') });
            return;
          }

          if (!['EN_CURSO', 'PAUSADO'].includes(je.estado)) {
            onDone({ error: new OperacionInvalidaError('El JuegoEjecutado debe estar EN_CURSO o PAUSADO') });
            return;
          }

          const reqEquipos = equiposStore.getAll();

          reqEquipos.onsuccess = () => {
            const equipos = (reqEquipos.result || [])
              .filter((e) => e.partida_id === partidaId)
              .sort((a, b) => a.posicion - b.posicion);

            if (equipos.length !== 2) {
              onDone({ error: new OperacionInvalidaError('La partida debe tener exactamente 2 equipos') });
              return;
            }

            const ts = ahora();

            const nuevoJE = {
              ...je,
              estado: 'FINALIZADO',
              resultado: {
                ...resultado,
                puntos_equipo_1: p1,
                puntos_equipo_2: p2
              },
              finish_reason: finishReason ?? null,
              finished_at: ts,
              paused_at: null,
              state_version: je.state_version + 1
            };

            jeStore.put(nuevoJE);

            const equipo1 = {
              ...equipos[0],
              puntaje: equipos[0].puntaje + p1,
              version: equipos[0].version + 1
            };

            const equipo2 = {
              ...equipos[1],
              puntaje: equipos[1].puntaje + p2,
              version: equipos[1].version + 1
            };

            equiposStore.put(equipo1);
            equiposStore.put(equipo2);

            const idx = jeStore.index('juego_ejecutado_partida_id');
            const reqJuegos = idx.getAll(partidaId);

            reqJuegos.onsuccess = () => {
              const juegos = (reqJuegos.result || [])
                .map((j) => j.id === je.id ? nuevoJE : j);

              const todosTerminales = juegos.every(
                (j) => j.estado === 'FINALIZADO' || j.estado === 'NO_JUGADO'
              );

              const nuevaPartida = {
                ...partida,
                estado: todosTerminales ? 'FINALIZADA' : 'EN_CURSO',
                finish_reason: todosTerminales
                  ? 'CIRCUITO_COMPLETO'
                  : partida.finish_reason ?? null,
                finished_at: todosTerminales
                  ? ts
                  : partida.finished_at ?? null,
                last_activity_at: ts,
                updated_at: ts,
                version: partida.version + 1
              };

              partidasStore.put(nuevaPartida);

              onDone({ partida: nuevaPartida, juegoEjecutado: nuevoJE, equipos: [equipo1, equipo2] });
            };

            reqJuegos.onerror = () => tx.abort();
          };

          reqEquipos.onerror = () => tx.abort();
        };

        reqJE.onerror = () => tx.abort();
      };

      reqPartida.onerror = () => tx.abort();
    });
  }

  async finalizarJuego(partidaId, juegoEjecutadoId, resultado, finishReason, sessionId, actionId) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(juegoEjecutadoId, 'juegoEjecutadoId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');

    if (!resultado || typeof resultado !== 'object') {
      throw new ValidacionError('resultado debe ser un objeto');
    }

    return this.adapter.tx(
      [
        STORE_PARTIDAS,
        STORE_JUEGOS_EJECUTADOS,
        STORE_EQUIPOS_PARTIDA,
        STORE_CONTROL,
        STORE_ACCIONES
      ],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, TIPO_ACCION.FINALIZAR_JUEGO, (reserva) => {
          if (reserva.yaProcesada) {
            resolver({ juegoEjecutado: reserva.resultado.juegoEjecutado });
            return;
          }

          this._finalizarJuegoEnTx(tx, partidaId, juegoEjecutadoId, resultado, finishReason, sessionId, (resultadoTx) => {
            if (resultadoTx.error) {
              resolver({ error: resultadoTx.error });
              return;
            }
            this.acciones.actualizarResultadoEnTx(tx, actionId, resultadoTx);
            resolver({ juegoEjecutado: resultadoTx.juegoEjecutado });
          });
        });
      }
    ).then((r) => {
      if (r && r.error) {
        throw r.error;
      }
      return r.juegoEjecutado;
    });
  }

  async descartarPartida(partidaId, sessionId, actionId) {
    return this._terminarPartida(
      partidaId, sessionId, actionId,
      TIPO_ACCION.DESCARTAR_PARTIDA,
      'DESCARTADA', null
    );
  }

  async finalizarCircuito(partidaId, sessionId, actionId) {
    return this._terminarPartida(
      partidaId, sessionId, actionId,
      TIPO_ACCION.FINALIZAR_CIRCUITO,
      'FINALIZADA', 'CIRCUITO_COMPLETO'
    );
  }

  async _terminarPartida(
    partidaId,
    sessionId,
    actionId,
    tipoAccion,
    estadoFinal,
    finishReasonPartida
  ) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(sessionId, 'sessionId');
    validarNoVacio(actionId, 'actionId');
    validarNoVacio(tipoAccion, 'tipoAccion');

    return this.adapter.tx(
      [
        STORE_PARTIDAS,
        STORE_JUEGOS_EJECUTADOS,
        STORE_CONTROL,
        STORE_ACCIONES
      ],
      'readwrite',
      (tx, resolver) => {
        this.acciones.reservarEnTx(tx, actionId, partidaId, tipoAccion, (reserva) => {
          if (reserva.yaProcesada) {
            resolver(reserva.resultado);
            return;
          }

          this._terminarPartidaEnTx(
            tx,
            partidaId,
            sessionId,
            estadoFinal,
            finishReasonPartida,
            (resultado) => {
              if (resultado.error) {
                resolver({ error: resultado.error });
                return;
              }
              this.acciones.actualizarResultadoEnTx(tx, actionId, resultado);
              resolver(resultado);
            }
          );
        });
      }
    ).then((r) => {
      if (r && r.error) {
        throw r.error;
      }
      return r;
    });
  }

  /* =============================================================
     Interno — trabajo real de _terminarPartida dentro de la tx.
     ============================================================= */
  _terminarPartidaEnTx(
    tx,
    partidaId,
    sessionId,
    estadoFinal,
    finishReasonPartida,
    onDone
  ) {
    const ahoraActual = ahora();

    this._verificarLeaseEnTx(
      tx,
      partidaId,
      sessionId,
      (ok) => {
        if (!ok) {
          onDone({ error: new SinControlError(partidaId) });
          return;
        }

        const partidasStore = tx.objectStore(STORE_PARTIDAS);
        const jeStore = tx.objectStore(STORE_JUEGOS_EJECUTADOS);

        const reqPartida = partidasStore.get(partidaId);

        reqPartida.onsuccess = () => {
          const partida = reqPartida.result;

          if (!partida) {
            onDone({ error: new NoEncontradoError('Partida', partidaId) });
            return;
          }

          if (partida.estado !== 'EN_CURSO') {
            onDone({ error: new OperacionInvalidaError('La partida debe estar EN_CURSO') });
            return;
          }

          const idx = jeStore.index('juego_ejecutado_partida_id');
          const reqJuegos = idx.getAll(partidaId);

          reqJuegos.onsuccess = () => {
            const juegos = reqJuegos.result || [];
            const juegosActualizados = [];

            for (const juego of juegos) {
              if (
                juego.estado === 'EN_CURSO' ||
                juego.estado === 'PAUSADO'
              ) {
                const actualizado = {
                  ...juego,
                  estado: 'FINALIZADO',
                  resultado:
                    juego.resultado ?? {
                      puntos_equipo_1: 0,
                      puntos_equipo_2: 0
                    },
                  finish_reason:
                    estadoFinal === 'DESCARTADA'
                      ? 'PARTIDA_DESCARTADA'
                      : 'PARTIDA_FINALIZADA',
                  finished_at: ahoraActual,
                  paused_at: null,
                  state_version: juego.state_version + 1
                };

                jeStore.put(actualizado);
                juegosActualizados.push(actualizado);
              } else if (juego.estado === 'PENDIENTE') {
                const actualizado = {
                  ...juego,
                  estado: 'NO_JUGADO',
                  resultado: null,
                  finish_reason:
                    estadoFinal === 'DESCARTADA'
                      ? 'PARTIDA_DESCARTADA'
                      : 'PARTIDA_FINALIZADA',
                  finished_at: ahoraActual,
                  paused_at: null,
                  state_version: juego.state_version + 1
                };

                jeStore.put(actualizado);
                juegosActualizados.push(actualizado);
              } else {
                juegosActualizados.push(juego);
              }
            }

            const nuevaPartida = {
              ...partida,
              estado: estadoFinal,
              finish_reason: finishReasonPartida,
              finished_at: ahoraActual,
              last_activity_at: ahoraActual,
              updated_at: ahoraActual,
              version: partida.version + 1
            };

            partidasStore.put(nuevaPartida);

            onDone({
              partida: nuevaPartida,
              juegos: juegosActualizados
            });
          };

          reqJuegos.onerror = () => tx.abort();
        };

        reqPartida.onerror = () => tx.abort();
      }
    );
  }

  async expirarPartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');

    const stores = [
      STORE_PARTIDAS,
      STORE_JUEGOS_EJECUTADOS
    ];

    const ahoraActual = ahora();

    return this.adapter.tx(
      stores,
      'readwrite',
      (tx, resolver) => {
        const partidasStore =
          tx.objectStore(STORE_PARTIDAS);

        const juegosStore =
          tx.objectStore(STORE_JUEGOS_EJECUTADOS);

        const reqPartida =
          partidasStore.get(partidaId);

        reqPartida.onsuccess = () => {
          const partida = reqPartida.result;

          if (!partida) {
            resolver({
              error: new NoEncontradoError(
                'Partida no encontrada'
              )
            });
            return;
          }

          if (partida.estado !== 'EN_CURSO') {
            resolver({
              error: new OperacionInvalidaError(
                'Solo se puede expirar una partida EN_CURSO'
              )
            });
            return;
          }

          const indice =
            juegosStore.index(
              'juego_ejecutado_partida_id'
            );

          const reqJuegos =
            indice.getAll(partidaId);

          reqJuegos.onsuccess = () => {
            const juegos =
              reqJuegos.result || [];

            const juegosActualizados = [];

            for (const juego of juegos) {
              if (
                juego.estado === 'EN_CURSO' ||
                juego.estado === 'PAUSADO'
              ) {
                const actualizado = {
                  ...juego,
                  estado: 'FINALIZADO',
                  resultado: juego.resultado ?? {
                    puntos_equipo_1: 0,
                    puntos_equipo_2: 0
                  },
                  finish_reason: 'PARTIDA_EXPIRADA',
                  finished_at: ahoraActual,
                  paused_at: null,
                  state_version:
                    juego.state_version + 1
                };

                juegosStore.put(actualizado);
                juegosActualizados.push(actualizado);
              } else if (
                juego.estado === 'PENDIENTE'
              ) {
                const actualizado = {
                  ...juego,
                  estado: 'NO_JUGADO',
                  resultado: null,
                  finish_reason: 'PARTIDA_EXPIRADA',
                  finished_at: ahoraActual,
                  paused_at: null,
                  state_version:
                    juego.state_version + 1
                };

                juegosStore.put(actualizado);
                juegosActualizados.push(actualizado);
              } else {
                juegosActualizados.push(juego);
              }
            }

            const nuevaPartida = {
              ...partida,
              estado: 'EXPIRADA',
              finish_reason: 'EXPIRACION',
              finished_at: ahoraActual,
              last_activity_at: ahoraActual,
              updated_at: ahoraActual,
              version: partida.version + 1
            };

            partidasStore.put(nuevaPartida);

            resolver({
              partida: nuevaPartida,
              juegos: juegosActualizados
            });
          };

          reqJuegos.onerror = () => {
            tx.abort();
          };
        };

        reqPartida.onerror = () => {
          tx.abort();
        };
      }
    ).then((r) => {
      if (r && r.error) {
        throw r.error;
      }

      return r;
    });
  }

  _verificarLeaseEnTx(tx, partidaId, sessionId, onResult) {
    const store = tx.objectStore(STORE_CONTROL);
    const req = store.get(partidaId);
    req.onsuccess = () => {
      const control = req.result;
      if (!control) { onResult(false); return; }
      const ts = ahora();
      const ok =
        control.session_id === sessionId &&
        control.expires_at !== null &&
        control.expires_at > ts;
      onResult(ok);
    };
  }
}
