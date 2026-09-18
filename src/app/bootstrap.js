/* =============================================================
   Bootstrap — inicializa servicios, registry y session.
   ============================================================= */

import {
  ControlService,
  PartidaService,
  CircuitoService,
  SetService,
  JuegoService,
  GameDefinitionRegistry
} from '../services/index.js';

import { SessionContext } from './session-context.js';
import { registrarTodos } from '../games/registro.js';
import { seedJuegos } from './seed.js';

/**
 * Inicializa la aplicación: servicios, session, registro de juegos.
 *
 * @param {LocalAdapter|SupabaseAdapter} adapter - Adapter ya abierto.
 * @param {object} [opciones={}]
 * @param {string|null} [opciones.usuarioId=null] - ID del usuario autenticado.
 * @returns {Promise<object>} Objeto app con adapter, session, services, registry.
 * @throws {Error} si el adapter no está abierto o algún service falla.
 */
export async function bootstrap(adapter, { usuarioId = null } = {}) {
  if (!adapter) {
    throw new Error('bootstrap: adapter requerido');
  }

  const session = new SessionContext({ usuarioId });

  const services = {
    control: new ControlService(adapter),
    partida: new PartidaService(adapter),
    circuito: new CircuitoService(adapter),
    set: new SetService(adapter),
    juego: new JuegoService(adapter),
    registry: new GameDefinitionRegistry()
  };

  registrarTodos(services.registry);
  await seedJuegos(services, services.registry);

  const app = {
    adapter,
    session,
    services,
    registry: services.registry
  };

  if (typeof window !== 'undefined') {
    window.cumpeo = app;
  }

  return app;
}
