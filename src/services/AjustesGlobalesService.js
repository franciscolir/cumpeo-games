/* =============================================================
   AjustesGlobalesService — fachada sobre AjustesGlobalesRepository.
   ============================================================= */

import { AjustesGlobalesRepository } from '../repositories/AjustesGlobalesRepository.js';

export class AjustesGlobalesService {
  constructor(adapter) {
    this.repo = new AjustesGlobalesRepository(adapter);
  }

  async obtener() {
    return this.repo.obtener();
  }

  async obtenerTiempoMaxPausaSeg() {
    const ajustes = await this.repo.obtener();
    return ajustes.tiempo_max_pausa_seg;
  }

  async actualizar(cambios) {
    return this.repo.actualizar(cambios);
  }
}
