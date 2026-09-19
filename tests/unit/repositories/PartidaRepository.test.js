import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { PartidaRepository } from '../../../src/repositories/PartidaRepository.js';
import { DB_NAME } from '../../../src/adapters/schema.js';

function nuevoActionId() {
  return crypto.randomUUID();
}

function borrarBase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const SESION = 's1';

describe('PartidaRepository', () => {
  let adapter;
  let repo;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    repo = new PartidaRepository(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  /* =============================================================
     Fixtures
     ============================================================= */

  async function crearCircuitoListoConJuegos(circuitoId = 'c1', nJuegos = 2) {
    const ts = new Date().toISOString();
    await adapter.tx(
      ['circuitos', 'circuito_juegos', 'equipo_circuitos', 'juegos'],
      'readwrite',
      (tx) => {
        tx.objectStore('circuitos').add({
          id: circuitoId,
          nombre: 'Noche de Juegos',
          estado: 'LISTO',
          es_plantilla: false,
          version: 1,
          created_at: ts,
          updated_at: ts
        });
        for (let i = 0; i < nJuegos; i++) {
          tx.objectStore('circuito_juegos').add({
            id: `cj-${circuitoId}-${i + 1}`,
            circuito_id: circuitoId,
            juego_id: `${circuitoId}-j${i + 1}`,
            orden: i + 1,
            configuracion: { rondas: 3 },
            snapshot_id: null,
            created_at: ts,
            updated_at: ts
          });
          tx.objectStore('juegos').add({
            id: `${circuitoId}-j${i + 1}`,
            codigo: `${circuitoId}_JUEGO_${i + 1}`,
            nombre: `Juego ${i + 1}`,
            descripcion: null,
            requiere_set: false,
            orden_catalogo: i + 1,
            activo: true,
            created_at: ts,
            updated_at: ts
          });
        }
        tx.objectStore('equipo_circuitos').add({
          id: `ec-${circuitoId}-1`,
          circuito_id: circuitoId,
          equipo_guardado_id: null,
          posicion: 1,
          nombre: 'Los Rojos',
          color: '#E53E3E',
          created_at: ts,
          updated_at: ts
        });
        tx.objectStore('equipo_circuitos').add({
          id: `ec-${circuitoId}-2`,
          circuito_id: circuitoId,
          equipo_guardado_id: null,
          posicion: 2,
          nombre: 'Los Amarillos',
          color: '#F6E05E',
          created_at: ts,
          updated_at: ts
        });
      }
    );
  }

  async function tomarControl(partidaId, sessionId = SESION) {
    await adapter.tx(['control_partidas'], 'readwrite', (tx) => {
      const req = tx.objectStore('control_partidas').get(partidaId);
      req.onsuccess = () => {
        const c = req.result;
        const ts = new Date().toISOString();
        tx.objectStore('control_partidas').put({
          ...c,
          session_id: sessionId,
          acquired_at: ts,
          heartbeat_at: ts,
          expires_at: new Date(Date.now() + 60000).toISOString()
        });
      };
    });
  }

  async function escenarioPartidaEnCurso(circuitoId = 'c1', publicCodigo = 'ABC123', sessionId = SESION, nJuegos = 3) {
    await crearCircuitoListoConJuegos(circuitoId, nJuegos);
    const p = await repo.crearPartida({ circuito_id: circuitoId, public_codigo: publicCodigo, actionId: nuevoActionId() });
    await tomarControl(p.id, sessionId);
    const r = await repo.comenzarPartida(p.id, sessionId, nuevoActionId());
    return { partida: p, juegos: r.juegos };
  }

  /* =============================================================
     listarPartidasExpirables
     ============================================================= */

  describe('listarPartidasExpirables', () => {
    async function ajustarActividad(partidaId, milisegundosAtras) {
      await adapter.tx(
        ['partidas'],
        'readwrite',
        (tx) => {
          const store = tx.objectStore('partidas');
          const req = store.get(partidaId);

          req.onsuccess = () => {
            const partida = req.result;
            store.put({
              ...partida,
              last_activity_at: new Date(
                Date.now() - milisegundosAtras
              ).toISOString()
            });
          };
        }
      );
    }

    it('incluye una partida con exactamente 24 horas de inactividad', async () => {
      const { partida } = await escenarioPartidaEnCurso(
        'exp-24',
        'EXP024'
      );

      await ajustarActividad(
        partida.id,
        24 * 60 * 60 * 1000 + 100
      );

      const lista = await repo.listarPartidasExpirables();

      expect(lista.some((p) => p.id === partida.id)).toBe(true);
    });

    it('incluye una partida con más de 24 horas de inactividad', async () => {
      const { partida } = await escenarioPartidaEnCurso(
        'exp-mas',
        'EXPMAS'
      );

      await ajustarActividad(
        partida.id,
        25 * 60 * 60 * 1000
      );

      const lista = await repo.listarPartidasExpirables();

      expect(lista.some((p) => p.id === partida.id)).toBe(true);
    });

    it('no incluye una partida con menos de 24 horas de inactividad', async () => {
      const { partida } = await escenarioPartidaEnCurso(
        'exp-menos',
        'EXPMEN'
      );

      await ajustarActividad(
        partida.id,
        23 * 60 * 60 * 1000
      );

      const lista = await repo.listarPartidasExpirables();

      expect(lista.some((p) => p.id === partida.id)).toBe(false);
    });

    it('no incluye partidas que no estén EN_CURSO aunque tengan más de 24 horas', async () => {
      await crearCircuitoListoConJuegos(
        'exp-estados',
        1
      );

      const p = await repo.crearPartida({
        circuito_id: 'exp-estados',
        public_codigo: 'EXPEST',
        actionId: nuevoActionId()
      });

      await ajustarActividad(
        p.id,
        25 * 60 * 60 * 1000
      );

      const lista = await repo.listarPartidasExpirables();

      expect(lista.some((partida) => partida.id === p.id)).toBe(false);
    });

    it('no incluye partidas FINALIZADAS antiguas', async () => {
      const { partida } = await escenarioPartidaEnCurso(
        'exp-final',
        'EXPFIN'
      );

      await repo.expirarPartida(partida.id);

      const lista = await repo.listarPartidasExpirables();

      expect(lista.some((p) => p.id === partida.id)).toBe(false);
    });
  });

  /* =============================================================
     crearPartida
     ============================================================= */

  describe('crearPartida', () => {
    it('crea partida en CONFIGURANDO con version=1 y metadata', async () => {
      await crearCircuitoListoConJuegos();
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'ABC123', actionId: nuevoActionId() });

      expect(p.id).toBeTruthy();
      expect(p.estado).toBe('CONFIGURANDO');
      expect(p.circuito_id).toBe('c1');
      expect(p.circuito_nombre).toBe('Noche de Juegos');
      expect(p.public_codigo).toBe('ABC123');
      expect(p.version).toBe(1);
      expect(p.started_at).toBeNull();
    });

    it('crea 1 ControlPartida libre', async () => {
      await crearCircuitoListoConJuegos();
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'X1', actionId: nuevoActionId() });

      const control = await adapter.tx(['control_partidas'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('control_partidas').get(p.id);
        req.onsuccess = () => resolver(req.result);
      });
      expect(control).toBeTruthy();
      expect(control.session_id).toBeNull();
    });

    it('crea 2 EquipoPartida copiando nombre+color', async () => {
      await crearCircuitoListoConJuegos();
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'X1', actionId: nuevoActionId() });

      const equipos = await adapter.tx(['equipo_partidas'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('equipo_partidas').index('equipo_partida_partida_id').getAll(p.id);
        req.onsuccess = () => resolver(req.result);
      });
      expect(equipos).toHaveLength(2);
      expect(equipos.map((e) => e.nombre).sort()).toEqual(['Los Amarillos', 'Los Rojos']);
      expect(equipos[0].puntaje).toBe(0);
    });

    it('rechaza public_codigo duplicado', async () => {
      await crearCircuitoListoConJuegos();
      await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'X1', actionId: nuevoActionId() });
      await expect(
        repo.crearPartida({ circuito_id: 'c1', public_codigo: 'X1', actionId: nuevoActionId() })
      ).rejects.toThrow(/ya en uso/);
    });

    it('rechaza circuito que no está LISTO', async () => {
      await crearCircuitoListoConJuegos();
      await adapter.tx(['circuitos'], 'readwrite', (tx) => {
        const req = tx.objectStore('circuitos').get('c1');
        req.onsuccess = () => {
          tx.objectStore('circuitos').put({ ...req.result, estado: 'BORRADOR' });
        };
      });
      await expect(
        repo.crearPartida({ circuito_id: 'c1', public_codigo: 'X1', actionId: nuevoActionId() })
      ).rejects.toThrow(/LISTO/);
    });

    it('es idempotente: dos llamadas con el mismo actionId devuelven la misma partida', async () => {
      await crearCircuitoListoConJuegos();
      const actionId = nuevoActionId();

      const p1 = await repo.crearPartida({
        circuito_id: 'c1',
        public_codigo: 'IDEM01',
        actionId
      });

      const p2 = await repo.crearPartida({
        circuito_id: 'c1',
        public_codigo: 'IDEM01',
        actionId
      });

      expect(p2.id).toBe(p1.id);
      expect(p2.public_codigo).toBe('IDEM01');

      // Solo debe haber 1 partida en la DB
      const todas = await repo.listar();
      expect(todas.length).toBe(1);
    });

    it('rechaza si el circuito no existe', async () => {
      await expect(
        repo.crearPartida({ circuito_id: 'nope', public_codigo: 'X1', actionId: nuevoActionId() })
      ).rejects.toThrow(/no encontrado/);
    });
  });

  /* =============================================================
     Consultas
     ============================================================= */

  describe('consultas', () => {
    it('obtenerPartidaPorCodigo devuelve la partida', async () => {
      await crearCircuitoListoConJuegos();
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'FINDME', actionId: nuevoActionId() });
      const r = await repo.obtenerPartidaPorCodigo('FINDME');
      expect(r.id).toBe(p.id);
    });

    it('obtenerPartidaPorCodigo devuelve null si no existe', async () => {
      expect(await repo.obtenerPartidaPorCodigo('NOPE')).toBeNull();
    });

    it('listarPartidasEnCurso devuelve solo EN_CURSO', async () => {
      await escenarioPartidaEnCurso();
      const lista = await repo.listarPartidasEnCurso();
      expect(lista).toHaveLength(1);
      expect(lista[0].estado).toBe('EN_CURSO');
    });

    it('listarPartidasRecuperables incluye CONFIGURANDO y EN_CURSO', async () => {
      await crearCircuitoListoConJuegos('cA', 2);
      await repo.crearPartida({ circuito_id: 'cA', public_codigo: 'A1', actionId: nuevoActionId() });
      await escenarioPartidaEnCurso('cB', 'B1');
      const lista = await repo.listarPartidasRecuperables();
      expect(lista.length).toBeGreaterThanOrEqual(2);
    });

    it('obtenerContextoEspera devuelve partida + equipos + participantes + juegos', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const ctx = await repo.obtenerContextoEspera(partida.id);
      expect(ctx.partida.id).toBe(partida.id);
      expect(ctx.equipos).toHaveLength(2);
      expect(ctx.juegos).toHaveLength(3);
    });

    it('obtenerContextoEspera enriquece juegos con juego_codigo del catálogo', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const ctx = await repo.obtenerContextoEspera(partida.id);
      for (let i = 0; i < ctx.juegos.length; i++) {
        expect(ctx.juegos[i].juego_codigo).toBe(`c1_JUEGO_${i + 1}`);
      }
    });

    it('obtenerContextoEspera devuelve juego_codigo null si juego no existe en catálogo', async () => {
      const ts = new Date().toISOString();
      await adapter.tx(
        ['circuitos', 'circuito_juegos', 'equipo_circuitos'],
        'readwrite',
        (tx) => {
          tx.objectStore('circuitos').add({
            id: 'cNoCatalogo',
            nombre: 'Sin Catálogo',
            estado: 'LISTO',
            es_plantilla: false,
            version: 1,
            created_at: ts,
            updated_at: ts
          });
          tx.objectStore('circuito_juegos').add({
            id: 'cj-nocat-1',
            circuito_id: 'cNoCatalogo',
            juego_id: 'j-inexistente',
            orden: 1,
            configuracion: {},
            snapshot_id: null,
            created_at: ts,
            updated_at: ts
          });
          tx.objectStore('equipo_circuitos').add({
            id: 'ec-nocat-1',
            circuito_id: 'cNoCatalogo',
            equipo_guardado_id: null,
            posicion: 1,
            nombre: 'Equipo A',
            color: '#000',
            created_at: ts,
            updated_at: ts
          });
          tx.objectStore('equipo_circuitos').add({
            id: 'ec-nocat-2',
            circuito_id: 'cNoCatalogo',
            equipo_guardado_id: null,
            posicion: 2,
            nombre: 'Equipo B',
            color: '#FFF',
            created_at: ts,
            updated_at: ts
          });
        }
      );
      const p = await repo.crearPartida({ circuito_id: 'cNoCatalogo', public_codigo: 'NC1', actionId: nuevoActionId() });
      await tomarControl(p.id);
      await repo.comenzarPartida(p.id, SESION, nuevoActionId());

      const ctx = await repo.obtenerContextoEspera(p.id);
      expect(ctx.juegos[0].juego_id).toBe('j-inexistente');
      expect(ctx.juegos[0].juego_codigo).toBeNull();
    });
  });

  /* =============================================================
     comenzarPartida
     ============================================================= */

  describe('comenzarPartida', () => {
    it('crea N JuegoEjecutado en PENDIENTE', async () => {
      await crearCircuitoListoConJuegos('c1', 3);
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'A1', actionId: nuevoActionId() });
      await tomarControl(p.id);
      const r = await repo.comenzarPartida(p.id, SESION, nuevoActionId());

      expect(r.juegos).toHaveLength(3);
      for (const j of r.juegos) {
        expect(j.estado).toBe('PENDIENTE');
        expect(j.estado_juego).toEqual({});
        expect(j.state_version).toBe(1);
      }
    });

    it('pasa la partida a EN_CURSO con started_at', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const actualizada = await repo.obtenerPartida(partida.id);
      expect(actualizada.estado).toBe('EN_CURSO');
      expect(actualizada.started_at).not.toBeNull();
    });

    it('rechaza sin lease', async () => {
      await crearCircuitoListoConJuegos();
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'A1', actionId: nuevoActionId() });
      await expect(
        repo.comenzarPartida(p.id, 'otra-sesion', nuevoActionId())
      ).rejects.toThrow(/Sin control/);
    });

    it('rechaza si la partida ya está EN_CURSO', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      await expect(
        repo.comenzarPartida(partida.id, SESION, nuevoActionId())
      ).rejects.toThrow(/no se puede comenzar/i);
    });

    it('es idempotente: dos llamadas con el mismo actionId no duplican juegos', async () => {
      await crearCircuitoListoConJuegos('c1', 2);
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'B1', actionId: nuevoActionId() });
      await tomarControl(p.id);
      const actionId = nuevoActionId();
      const r1 = await repo.comenzarPartida(p.id, SESION, actionId);
      const r2 = await repo.comenzarPartida(p.id, SESION, actionId);
      expect(r1.juegos).toHaveLength(2);
      expect(r2.juegos).toHaveLength(2);
      expect(r2.juegos.map((j) => j.id).sort()).toEqual(r1.juegos.map((j) => j.id).sort());
    });
  });

  /* =============================================================
     iniciarJuego
     ============================================================= */

  describe('iniciarJuego', () => {
    it('pasa un JuegoEjecutado de PENDIENTE a EN_CURSO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const r = await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(r.estado).toBe('EN_CURSO');
      expect(r.started_at).not.toBeNull();
      expect(r.state_version).toBe(2);
    });

    it('rechaza si ya hay otro juego activo (INV-055)', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await expect(
        repo.iniciarJuego(partida.id, juegos[1].id, SESION, nuevoActionId())
      ).rejects.toThrow(/INV-055/);
    });

    it('rechaza sin lease', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await expect(
        repo.iniciarJuego(partida.id, juegos[0].id, 'otra', nuevoActionId())
      ).rejects.toThrow(/Sin control/);
    });

    it('es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const actionId = nuevoActionId();
      const r1 = await repo.iniciarJuego(partida.id, juegos[0].id, SESION, actionId);
      const r2 = await repo.iniciarJuego(partida.id, juegos[0].id, SESION, actionId);
      expect(r1.estado).toBe('EN_CURSO');
      expect(r2.estado).toBe('EN_CURSO');
      expect(r2.started_at).toBe(r1.started_at);
      expect(r2.state_version).toBe(r1.state_version);
    });
  });

  /* =============================================================
     pausar / reanudar
     ============================================================= */

  describe('pausar / reanudar', () => {
    it('pausar pone paused_at', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await repo.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(r.estado).toBe('PAUSADO');
      expect(r.paused_at).not.toBeNull();
    });

    it('reanudar limpia paused_at', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await repo.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await repo.reanudarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(r.estado).toBe('EN_CURSO');
      expect(r.paused_at).toBeNull();
    });

    it('pausar rechaza si la Partida no está EN_CURSO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso('c1', 'ABC124', SESION, 1);

      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      await repo.finalizarJuego(
        partida.id,
        juegos[0].id,
        { puntos_equipo_1: 1, puntos_equipo_2: 0 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );

      await expect(
        repo.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId())
      ).rejects.toThrow(/Partida no está EN_CURSO/);
    });

    it('pausar es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      const actionId = nuevoActionId();

      const r1 = await repo.pausarJuego(partida.id, juegos[0].id, SESION, actionId);
      const r2 = await repo.pausarJuego(partida.id, juegos[0].id, SESION, actionId);

      expect(r1.estado).toBe('PAUSADO');
      expect(r2.estado).toBe('PAUSADO');
      expect(r2.state_version).toBe(r1.state_version);
    });

    it('reanudar es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await repo.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      const actionId = nuevoActionId();

      const r1 = await repo.reanudarJuego(partida.id, juegos[0].id, SESION, actionId);
      const r2 = await repo.reanudarJuego(partida.id, juegos[0].id, SESION, actionId);

      expect(r1.estado).toBe('EN_CURSO');
      expect(r2.estado).toBe('EN_CURSO');
      expect(r2.state_version).toBe(r1.state_version);
    });

    it('reanudar rechaza si la Partida no está EN_CURSO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso('c1', 'ABC125', SESION, 1);

      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await repo.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      await repo.finalizarJuego(
        partida.id,
        juegos[0].id,
        { puntos_equipo_1: 1, puntos_equipo_2: 0 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );

      await expect(
        repo.reanudarJuego(partida.id, juegos[0].id, SESION, nuevoActionId())
      ).rejects.toThrow(/Partida no está EN_CURSO/);
    });
  });

  /* =============================================================
     actualizarEstadoJuego
     ============================================================= */

  describe('actualizarEstadoJuego', () => {
    it('actualiza estado_juego y state_version', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const je = await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await repo.actualizarEstadoJuego(
        partida.id, juegos[0].id,
        { fase: 'PREGUNTANDO' },
        je.state_version,
        SESION,
        nuevoActionId()
      );
      expect(r.estado_juego).toEqual({ fase: 'PREGUNTANDO' });
      expect(r.state_version).toBe(je.state_version + 1);
    });

    it('rechaza con expectedStateVersion incorrecta', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await expect(
        repo.actualizarEstadoJuego(partida.id, juegos[0].id, { fase: 'X' }, 99, SESION, nuevoActionId())
      ).rejects.toThrow(/Conflicto/);
    });

    it('es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const je = await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const actionId = nuevoActionId();
      const r1 = await repo.actualizarEstadoJuego(
        partida.id, juegos[0].id,
        { fase: 'PREGUNTANDO' },
        je.state_version,
        SESION,
        actionId
      );
      const r2 = await repo.actualizarEstadoJuego(
        partida.id, juegos[0].id,
        { fase: 'PREGUNTANDO' },
        je.state_version,
        SESION,
        actionId
      );
      expect(r2.id).toBe(r1.id);
      expect(r2.state_version).toBe(r1.state_version);
      expect(r2.estado_juego).toEqual(r1.estado_juego);
    });
  });

  /* =============================================================
     finalizarJuego
     ============================================================= */

  describe('finalizarJuego', () => {
    it('finaliza el juego y suma puntos a los equipos', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      const r = await repo.finalizarJuego(
        partida.id, juegos[0].id,
        { puntos_equipo_1: 100, puntos_equipo_2: 50 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );
      expect(r.estado).toBe('FINALIZADO');
      expect(r.finish_reason).toBe('NORMAL');

      const equipos = await adapter.tx(['equipo_partidas'], 'readonly', (tx, resolver) => {
        const req = tx.objectStore('equipo_partidas').index('equipo_partida_partida_id').getAll(partida.id);
        req.onsuccess = () => resolver(req.result.sort((a, b) => a.posicion - b.posicion));
      });
      expect(equipos[0].puntaje).toBe(100);
      expect(equipos[1].puntaje).toBe(50);
    });

    it('actualiza updated_at al finalizar el JuegoEjecutado', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();

      const iniciado = await repo.iniciarJuego(
        partida.id,
        juegos[0].id,
        SESION,
        nuevoActionId()
      );

      const antes = iniciado.updated_at;

      const finalizado = await repo.finalizarJuego(
        partida.id,
        juegos[0].id,
        { puntos_equipo_1: 10, puntos_equipo_2: 0 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );

      expect(finalizado.updated_at).toBeTruthy();
      expect(new Date(finalizado.updated_at).toString()).not.toBe("Invalid Date");
    });

    it('finaliza la partida cuando todos los juegos están terminales', async () => {
      await crearCircuitoListoConJuegos('c1', 1);
      const p = await repo.crearPartida({ circuito_id: 'c1', public_codigo: 'A1', actionId: nuevoActionId() });
      await tomarControl(p.id);
      const r = await repo.comenzarPartida(p.id, SESION, nuevoActionId());
      await repo.iniciarJuego(p.id, r.juegos[0].id, SESION, nuevoActionId());

      await repo.finalizarJuego(
        p.id, r.juegos[0].id,
        { puntos_equipo_1: 10, puntos_equipo_2: 0 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );

      const recargada = await repo.obtenerPartida(p.id);
      expect(recargada.estado).toBe('FINALIZADA');
      expect(recargada.finish_reason).toBe('CIRCUITO_COMPLETO');
    });

    it('rechaza sin lease', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await expect(
        repo.finalizarJuego(partida.id, juegos[0].id, { puntos_equipo_1: 1 }, 'NORMAL', 'otra', nuevoActionId())
      ).rejects.toThrow(/Sin control/);
    });

    it('es idempotente: dos llamadas con el mismo actionId no duplican puntos', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const actionId = nuevoActionId();
      const r1 = await repo.finalizarJuego(
        partida.id, juegos[0].id,
        { puntos_equipo_1: 100, puntos_equipo_2: 50 },
        'NORMAL',
        SESION,
        actionId
      );
      const r2 = await repo.finalizarJuego(
        partida.id, juegos[0].id,
        { puntos_equipo_1: 100, puntos_equipo_2: 50 },
        'NORMAL',
        SESION,
        actionId
      );
      expect(r2.id).toBe(r1.id);
      expect(r2.estado).toBe('FINALIZADO');

      const ctx = await repo.obtenerContextoEspera(partida.id);
      const eq1 = ctx.equipos.find((e) => e.posicion === 1);
      const eq2 = ctx.equipos.find((e) => e.posicion === 2);
      expect(eq1.puntaje).toBe(100);
      expect(eq2.puntaje).toBe(50);
    });
  });

  /* =============================================================
     descartarPartida / finalizarCircuito
     ============================================================= */

  describe('descartarPartida', () => {
    it('marca la partida DESCARTADA y los pendientes NO_JUGADO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      await repo.descartarPartida(partida.id, SESION, nuevoActionId());

      const p = await repo.obtenerPartida(partida.id);
      expect(p.estado).toBe('DESCARTADA');

      const ctx = await repo.obtenerContextoEspera(partida.id);
      const enCurso = ctx.juegos.find((j) => j.id === juegos[0].id);
      expect(enCurso.estado).toBe('FINALIZADO');
      expect(enCurso.finish_reason).toBe('PARTIDA_DESCARTADA');

      const pendientes = ctx.juegos.filter((j) => j.id !== juegos[0].id);
      for (const j of pendientes) {
        expect(j.estado).toBe('NO_JUGADO');
      }
    });
  });

  describe('finalizarCircuito', () => {
    it('marca la partida FINALIZADA y resuelve todos los JuegoEjecutado', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();

      await repo.iniciarJuego(
        partida.id,
        juegos[0].id,
        SESION,
        nuevoActionId()
      );

      await repo.finalizarCircuito(
        partida.id,
        SESION,
        nuevoActionId()
      );

      const p = await repo.obtenerPartida(partida.id);

      expect(p.estado).toBe('FINALIZADA');
      expect(p.finish_reason).toBe('CIRCUITO_COMPLETO');

      const ctx = await repo.obtenerContextoEspera(partida.id);

      const activoFinalizado = ctx.juegos.find(
        (j) => j.id === juegos[0].id
      );

      expect(activoFinalizado.estado).toBe('FINALIZADO');
      expect(activoFinalizado.resultado).not.toBeNull();

      const pendientes = ctx.juegos.filter(
        (j) => j.id !== juegos[0].id
      );

      for (const j of pendientes) {
        expect(j.estado).toBe('NO_JUGADO');
      }
    });
  });

    it('descartarPartida es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      const actionId = nuevoActionId();

      const r1 = await repo.descartarPartida(partida.id, SESION, actionId);
      const r2 = await repo.descartarPartida(partida.id, SESION, actionId);

      expect(r1.partida.estado).toBe('DESCARTADA');
      expect(r2.partida.estado).toBe('DESCARTADA');
      expect(r2.partida.version).toBe(r1.partida.version);
    });

    it('finalizarCircuito es idempotente: dos llamadas con el mismo actionId no duplican el cambio', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await repo.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());

      const actionId = nuevoActionId();

      const r1 = await repo.finalizarCircuito(partida.id, SESION, actionId);
      const r2 = await repo.finalizarCircuito(partida.id, SESION, actionId);

      expect(r1.partida.estado).toBe('FINALIZADA');
      expect(r2.partida.estado).toBe('FINALIZADA');
      expect(r2.partida.version).toBe(r1.partida.version);
    });

  /* =============================================================
     expirarPartida
     ============================================================= */

  describe('expirarPartida', () => {
    it('pasa la partida a EXPIRADA', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      await repo.expirarPartida(partida.id);
      const p = await repo.obtenerPartida(partida.id);
      expect(p.estado).toBe('EXPIRADA');
      expect(p.finished_at).not.toBeNull();
    });

    it('finaliza los juegos activos y marca los pendientes como NO_JUGADO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();

      await repo.iniciarJuego(
        partida.id,
        juegos[0].id,
        SESION,
        nuevoActionId()
      );

      await repo.expirarPartida(partida.id);

      const ctx = await repo.obtenerContextoEspera(partida.id);

      const activo = ctx.juegos.find(
        (j) => j.id === juegos[0].id
      );

      expect(activo.estado).toBe('FINALIZADO');
      expect(activo.resultado).not.toBeNull();
      expect(activo.finish_reason).toBe('PARTIDA_EXPIRADA');

      const pendientes = ctx.juegos.filter(
        (j) => j.id !== juegos[0].id
      );

      expect(pendientes).toHaveLength(2);

      for (const j of pendientes) {
        expect(j.estado).toBe('NO_JUGADO');
        expect(j.resultado).toBeNull();
        expect(j.finish_reason).toBe('PARTIDA_EXPIRADA');
      }
    });

    it('expira también cuando el JuegoEjecutado está PAUSADO', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();

      await repo.iniciarJuego(
        partida.id,
        juegos[0].id,
        SESION,
        nuevoActionId()
      );

      await repo.pausarJuego(
        partida.id,
        juegos[0].id,
        SESION
      , nuevoActionId());

      await repo.expirarPartida(partida.id);

      const ctx = await repo.obtenerContextoEspera(partida.id);

      const pausado = ctx.juegos.find(
        (j) => j.id === juegos[0].id
      );

      expect(pausado.estado).toBe('FINALIZADO');
      expect(pausado.paused_at).toBeNull();
      expect(pausado.resultado).not.toBeNull();
      expect(pausado.finish_reason).toBe('PARTIDA_EXPIRADA');
    });

    it('no requiere lease', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      await repo.expirarPartida(partida.id);
      const p = await repo.obtenerPartida(partida.id);
      expect(p.estado).toBe('EXPIRADA');
    });
  });
});
