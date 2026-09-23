/* =============================================================
   Registro de juegos disponibles.
   Se llama una vez desde bootstrap().
   ============================================================= */

import { TriviaGameDefinition } from './trivia/TriviaGameDefinition.js';
import { QuePiensaElPublicoGameDefinition } from './que-piensa-el-publico/QuePiensaElPublicoGameDefinition.js';
import { RoscoGameDefinition } from './rosco/RoscoGameDefinition.js';
import { CancionIncompletaGameDefinition } from './cancion-incompleta/CancionIncompletaGameDefinition.js';
import { PictionaryGameDefinition } from './pictionary/PictionaryGameDefinition.js';
import { HistoriaEnredadaGameDefinition } from './historia-enredada/HistoriaEnredadaGameDefinition.js';
import { MemoriaGameDefinition } from './memoria/MemoriaGameDefinition.js';
import { AntiTriviaGameDefinition } from './anti-trivia/AntiTriviaGameDefinition.js';
import { EnlacesGameDefinition } from './enlaces/EnlacesGameDefinition.js';

/**
 * Registra todos los juegos disponibles en el registry.
 * @param {GameDefinitionRegistry} registry
 * @returns {string[]} Lista de códigos registrados.
 */
export function registrarTodos(registry) {
  const definiciones = [
    TriviaGameDefinition,
    QuePiensaElPublicoGameDefinition,
    RoscoGameDefinition,
    CancionIncompletaGameDefinition,
    PictionaryGameDefinition,
    HistoriaEnredadaGameDefinition,
    MemoriaGameDefinition,
    AntiTriviaGameDefinition,
    EnlacesGameDefinition
  ];

  for (const def of definiciones) {
    registry.registrar(def);
  }

  return registry.listarCodigos();
}
