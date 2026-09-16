/* =============================================================
   Bootstrap — inicializa servicios, registry y session.
   ============================================================= */

import {
  ControlService,
  PartidaService,
  CircuitoService,
  SetService,
  GameDefinitionRegistry
} from '../services/index.js';

import { SessionContext } from './session-context.js';
import { registrarTodos } from '../games/registro.js';

/**
 * Inicializa la aplicación: servicios, session, registro de juegos.
 *
 * @param {LocalAdapter} adapter - Adapter ya abierto.
 * @returns {Promise<{
 *   adapter: LocalAdapter,
 *   session: SessionContext,
 *   services: {
 *     control: ControlService,
 *     partida: PartidaService,
 *     circuito: CircuitoService,
 *     set: SetService,
 *     registry: GameDefinitionRegistry
 *   },
 *   registry: GameDefinitionRegistry
 * }>}}
 * @throws {Error} si el adapter no está abierto o algún service falla.
 */
export async function bootstrap(adapter) {
  if (!adapter) {
    throw new Error('bootstrap: adapter requerido');
  }

  const session = new SessionContext();

  const services = {
    control: new ControlService(adapter),
    partida: new PartidaService(adapter),
    circuito: new CircuitoService(adapter),
    set: new SetService(adapter),
    registry: new GameDefinitionRegistry()
  };

  registrarTodos(services.registry);

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
