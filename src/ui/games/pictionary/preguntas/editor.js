/* =============================================================
   Editor de Items — Pictionary — PREGUNTAS (re-export parametrizado).
   ============================================================= */

import { renderEditorItemsConceptoPictionary } from '../_shared/editor-concepto.js';

/**
 * Renderiza el editor de PREGUNTAS sí/no de Pictionary.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export function renderEditorItemsPictionaryPreguntas(container, app, setId) {
  return renderEditorItemsConceptoPictionary(container, app, setId, {
    submodo: 'PREGUNTAS',
    instruccion: 'El adivinador está de espaldas. Hace preguntas de sí/no.',
    idPrefix: 'pictionary-preguntas',
    titulo: 'Conceptos del set — Preguntas sí/no'
  });
}
