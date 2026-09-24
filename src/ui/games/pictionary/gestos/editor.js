/* =============================================================
   Editor de Items — Pictionary — GESTOS (re-export parametrizado).
   ============================================================= */

import { renderEditorItemsConceptoPictionary } from '../_shared/editor-concepto.js';

/**
 * Renderiza el editor de GESTOS de Pictionary.
 * @param {HTMLElement} container
 * @param {object} app
 * @param {string} setId
 */
export function renderEditorItemsPictionaryGestos(container, app, setId) {
  return renderEditorItemsConceptoPictionary(container, app, setId, {
    submodo: 'GESTOS',
    instruccion: 'El representante usa gestos, sin hablar ni hacer sonidos.',
    idPrefix: 'pictionary-gestos',
    titulo: 'Conceptos del set — Gestos'
  });
}
