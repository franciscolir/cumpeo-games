import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { LocalAdapter } from '../../../src/adapters/LocalAdapter.js';
import { PartidaService } from '../../../src/services/PartidaService.js';
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

describe('PartidaService', () => {
  let adapter;
  let service;

  beforeEach(async () => {
    await borrarBase();
    adapter = new LocalAdapter();
    await adapter.abrir();
    service = new PartidaService(adapter);
  });

  afterEach(async () => {
    await adapter.cerrar();
    await borrarBase();
  });

  async function crearCircuitoListoConJuegos(circuitoId = 'c1', nJuegos = 2) {
    const ts = new Date().toISOString();
    await adapter.tx(
      ['circuitos', 'circuito_juegos', 'equipo_circuitos'],
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
            juego_id: `j${i + 1}`,
            orden: i + 1,
            configuracion: { rondas: 3 },
            snapshot_id: null,
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

  async function escenarioPartidaEnCurso() {
    await crearCircuitoListoConJuegos('c1', 2);
    const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'ABC123' }, nuevoActionId());
    await service.tomarControl(p.id, SESION);
    const r = await service.comenzarPartida(p.id, SESION, nuevoActionId());
    return { partida: p, juegos: r.juegos };
  }

  /* =============================================================
     Grupo 1 — Lecturas
     ============================================================= */

  describe('obtenerPartida', () => {
    it('delega al repo', async () => {
      await crearCircuitoListoConJuegos();
      const p1 = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'X1' }, nuevoActionId());
      const p2 = await service.obtenerPartida(p1.id);
      expect(p2.id).toBe(p1.id);
    });
  });

  describe('obtenerContextoEspera', () => {
    it('delega al repo', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const ctx = await service.obtenerContextoEspera(partida.id);
      expect(ctx.partida.id).toBe(partida.id);
      expect(ctx.juegos.length).toBe(2);
      expect(ctx.equipos.length).toBe(2);
    });
  });

  describe('obtenerPartidaPorCodigo', () => {
    it('delega al repo', async () => {
      await crearCircuitoListoConJuegos();
      const p1 = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'COD1' }, nuevoActionId());
      const p2 = await service.obtenerPartidaPorCodigo('COD1');
      expect(p2.id).toBe(p1.id);
    });
  });

  describe('listarPartidasPorEstado', () => {
    it('delega al repo', async () => {
      await crearCircuitoListoConJuegos();
      await service.crearPartida({ circuito_id: 'c1', public_codigo: 'L1' }, nuevoActionId());
      const lista = await service.listarPartidasPorEstado('CONFIGURANDO');
      expect(lista.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('listarPartidasEnCurso', () => {
    it('delega al repo', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const lista = await service.listarPartidasEnCurso();
      expect(lista.some((p) => p.id === partida.id)).toBe(true);
    });
  });

  describe('listarPartidasRecuperables', () => {
    it('delega al repo', async () => {
      const lista = await service.listarPartidasRecuperables();
      expect(Array.isArray(lista)).toBe(true);
    });
  });

  describe('listarPartidasExpirables', () => {
    it('delega al repo', async () => {
      const lista = await service.listarPartidasExpirables();
      expect(Array.isArray(lista)).toBe(true);
    });
  });

  /* =============================================================
     Grupo 2 — Lease
     ============================================================= */

  describe('tomarControl', () => {
    it('delega a ControlService', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'T1' }, nuevoActionId());
      const r = await service.tomarControl(p.id, SESION);
      expect(r.adquirido).toBe(true);
    });
  });

  describe('renovarControl', () => {
    it('delega a ControlService', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'R1' }, nuevoActionId());
      await service.tomarControl(p.id, SESION);
      const r = await service.renovarControl(p.id, SESION);
      expect(r.renovado).toBe(true);
    });
  });

  describe('liberarControl', () => {
    it('delega a ControlService', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'L2' }, nuevoActionId());
      await service.tomarControl(p.id, SESION);
      const r = await service.liberarControl(p.id, SESION);
      expect(r.liberado).toBe(true);
    });
  });

  describe('verificarControl', () => {
    it('delega a ControlService', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'V1' }, nuevoActionId());
      await service.tomarControl(p.id, SESION);
      const ok = await service.verificarControl(p.id, SESION);
      expect(ok).toBe(true);
    });
  });

  /* =============================================================
     Grupo 3 — Escritura crítica
     ============================================================= */

  describe('crearPartida', () => {
    it('delega al repo con actionId', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'C1' }, nuevoActionId());
      expect(p.estado).toBe('CONFIGURANDO');
      expect(p.circuito_id).toBe('c1');
    });
  });

  describe('comenzarPartida', () => {
    it('delega al repo con actionId', async () => {
      await crearCircuitoListoConJuegos();
      const p = await service.crearPartida({ circuito_id: 'c1', public_codigo: 'C2' }, nuevoActionId());
      await service.tomarControl(p.id, SESION);
      const r = await service.comenzarPartida(p.id, SESION, nuevoActionId());
      expect(r.juegos.length).toBe(2);
    });
  });

  describe('iniciarJuego', () => {
    it('delega al repo con actionId', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const juego = await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(juego.estado).toBe('EN_CURSO');
    });
  });

  describe('actualizarEstadoJuego', () => {
    it('delega al repo con actionId', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      const je = await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await service.actualizarEstadoJuego(
        partida.id, juegos[0].id,
        { fase: 'PREGUNTANDO' },
        je.state_version,
        SESION,
        nuevoActionId()
      );
      expect(r.estado_juego).toEqual({ fase: 'PREGUNTANDO' });
    });
  });

  describe('pausarJuego', () => {
    it('delega al repo con actionId', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await service.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(r.estado).toBe('PAUSADO');
    });
  });

  describe('reanudarJuego', () => {
    it('delega al repo con actionId', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      await service.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await service.reanudarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(r.estado).toBe('EN_CURSO');
    });
  });

  describe('finalizarJuego', () => {
    it('delega al repo con actionId', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const r = await service.finalizarJuego(
        partida.id, juegos[0].id,
        { puntos_equipo_1: 100, puntos_equipo_2: 50 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );
      expect(r.estado).toBe('FINALIZADO');
    });
  });

  describe('descartarPartida', () => {
    it('delega al repo con actionId', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const r = await service.descartarPartida(partida.id, SESION, nuevoActionId());
      expect(r.partida.estado).toBe('DESCARTADA');
    });
  });

  describe('finalizarCircuito', () => {
    it('delega al repo con actionId', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const r = await service.finalizarCircuito(partida.id, SESION, nuevoActionId());
      expect(r.partida.estado).toBe('FINALIZADA');
    });
  });

  describe('expirarPartida', () => {
    it('delega al repo sin actionId', async () => {
      const { partida } = await escenarioPartidaEnCurso();
      const r = await service.expirarPartida(partida.id);
      expect(r.partida.estado).toBe('EXPIRADA');
    });
  });

  /* =============================================================
     Integración end-to-end
     ============================================================= */

  describe('flujo completo básico', () => {
    it('crear → tomarControl → comenzar → iniciar → finalizar', async () => {
      await crearCircuitoListoConJuegos('e2e', 1);
      const p = await service.crearPartida({ circuito_id: 'e2e', public_codigo: 'E1' }, nuevoActionId());
      await service.tomarControl(p.id, SESION);
      const r = await service.comenzarPartida(p.id, SESION, nuevoActionId());
      await service.iniciarJuego(p.id, r.juegos[0].id, SESION, nuevoActionId());
      const finalizado = await service.finalizarJuego(
        p.id, r.juegos[0].id,
        { puntos_equipo_1: 100, puntos_equipo_2: 50 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );
      expect(finalizado.estado).toBe('FINALIZADO');

      const ctx = await service.obtenerContextoEspera(p.id);
      expect(ctx.partida.estado).toBe('FINALIZADA');
      const eq1 = ctx.equipos.find((e) => e.posicion === 1);
      const eq2 = ctx.equipos.find((e) => e.posicion === 2);
      expect(eq1.puntaje).toBe(100);
      expect(eq2.puntaje).toBe(50);
    });
  });

  describe('flujo con pausa', () => {
    it('iniciar → pausar → reanudar → finalizar', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const pausado = await service.pausarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(pausado.estado).toBe('PAUSADO');
      const reanudado = await service.reanudarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      expect(reanudado.estado).toBe('EN_CURSO');
      const finalizado = await service.finalizarJuego(
        partida.id, juegos[0].id,
        { puntos_equipo_1: 10, puntos_equipo_2: 0 },
        'NORMAL',
        SESION,
        nuevoActionId()
      );
      expect(finalizado.estado).toBe('FINALIZADO');
    });
  });

  describe('flujo con descarte', () => {
    it('iniciar → descartar', async () => {
      const { partida, juegos } = await escenarioPartidaEnCurso();
      await service.iniciarJuego(partida.id, juegos[0].id, SESION, nuevoActionId());
      const descartada = await service.descartarPartida(partida.id, SESION, nuevoActionId());
      expect(descartada.partida.estado).toBe('DESCARTADA');
      const ctx = await service.obtenerContextoEspera(partida.id);
      const activo = ctx.juegos.find((j) => j.id === juegos[0].id);
      expect(activo.estado).toBe('FINALIZADO');
      expect(activo.finish_reason).toBe('PARTIDA_DESCARTADA');
    });
  });
});
