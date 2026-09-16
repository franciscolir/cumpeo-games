/* =============================================================
   ParticipanteRepository — participantes de una partida (R5).
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import {
  NoEncontradoError,
  ValidacionError,
  OperacionInvalidaError
} from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'participante_partidas';
const STORE_EQUIPOS_PARTIDA = 'equipo_partidas';
const STORE_PARTIDAS = 'partidas';

export class ParticipanteRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  async obtenerParticipante(participanteId) {
    return this.obtener(participanteId);
  }

  async listarParticipantesDePartida(partidaId) {
    validarNoVacio(partidaId, 'partidaId');
    const lista = await this.listarPorIndice('participante_partida_partida_id', partidaId);
    return lista.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }

  async listarParticipantesDeEquipo(equipoPartidaId) {
    validarNoVacio(equipoPartidaId, 'equipoPartidaId');
    const lista = await this.listarPorIndice('participante_partida_equipo_partida_id', equipoPartidaId);
    return lista.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }

  async agregarParticipante(partidaId, equipoPartidaId, nombre) {
    validarNoVacio(partidaId, 'partidaId');
    validarNoVacio(equipoPartidaId, 'equipoPartidaId');
    validarNoVacio(nombre, 'nombre');

    return this.adapter.tx(
      [STORE, STORE_EQUIPOS_PARTIDA, STORE_PARTIDAS],
      'readwrite',
      (tx, resolver) => {
        const partidaStore = tx.objectStore(STORE_PARTIDAS);
        const reqPartida = partidaStore.get(partidaId);

        reqPartida.onsuccess = () => {
          const partida = reqPartida.result;
          if (!partida) {
            resolver({ error: new NoEncontradoError('Partida', partidaId) });
            return;
          }
          if (partida.estado === 'FINALIZADA' ||
              partida.estado === 'DESCARTADA' ||
              partida.estado === 'EXPIRADA') {
            resolver({ error: new OperacionInvalidaError(
              `No se pueden agregar participantes a una partida en estado ${partida.estado}`
            ) });
            return;
          }

          const equipoStore = tx.objectStore(STORE_EQUIPOS_PARTIDA);
          const reqEquipo = equipoStore.get(equipoPartidaId);

          reqEquipo.onsuccess = () => {
            const equipo = reqEquipo.result;
            if (!equipo) {
              resolver({ error: new NoEncontradoError('EquipoPartida', equipoPartidaId) });
              return;
            }
            if (equipo.partida_id !== partidaId) {
              resolver({ error: new ValidacionError(
                'El equipo no pertenece a la partida indicada (INV-070)'
              ) });
              return;
            }

            const participante = {
              id: nuevoId(),
              partida_id: partidaId,
              equipo_partida_id: equipoPartidaId,
              nombre,
              ha_participado: false,
              created_at: ahora()
            };

            tx.objectStore(STORE).add(participante);
            resolver({ participante });
          };

          reqEquipo.onerror = () => tx.abort();
        };

        reqPartida.onerror = () => tx.abort();
      }
    ).then((r) => {
      if (r && r.error) throw r.error;
      return r.participante;
    });
  }

  async eliminarParticipante(participanteId) {
    validarNoVacio(participanteId, 'participanteId');

    return this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.get(participanteId);

      req.onsuccess = () => {
        const p = req.result;
        if (!p) {
          resolver({ error: new NoEncontradoError('ParticipantePartida', participanteId) });
          return;
        }
        if (p.ha_participado === true) {
          resolver({ error: new OperacionInvalidaError(
            'No se puede eliminar un participante que ya participó (INV-159)'
          ) });
          return;
        }
        store.delete(participanteId);
        resolver({ eliminado: true });
      };

      req.onerror = () => tx.abort();
    }).then((r) => {
      if (r && r.error) throw r.error;
      return undefined;
    });
  }

  async marcarParticipacion(participanteId) {
    validarNoVacio(participanteId, 'participanteId');

    return this.adapter.tx([STORE], 'readwrite', (tx, resolver) => {
      const store = tx.objectStore(STORE);
      const req = store.get(participanteId);

      req.onsuccess = () => {
        const p = req.result;
        if (!p) {
          resolver({ error: new NoEncontradoError('ParticipantePartida', participanteId) });
          return;
        }
        if (p.ha_participado === true) {
          resolver({ participante: p, yaMarcado: true });
          return;
        }
        const actualizado = { ...p, ha_participado: true };
        store.put(actualizado);
        resolver({ participante: actualizado, yaMarcado: false });
      };

      req.onerror = () => tx.abort();
    }).then((r) => {
      if (r && r.error) throw r.error;
      return r.participante;
    });
  }
}
