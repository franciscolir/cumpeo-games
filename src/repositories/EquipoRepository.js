/* =============================================================
   EquipoRepository — plantillas reutilizables de equipo (H3.b).
   Las operaciones de equipos de partida se agregan en H3.f.
   ============================================================= */

import { BaseRepository } from './BaseRepository.js';
import { NoEncontradoError, ValidacionError } from './errors.js';
import { ahora, nuevoId, validarNoVacio } from './utils.js';

const STORE = 'equipos_guardados';
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export class EquipoRepository extends BaseRepository {
  constructor(adapter) {
    super(adapter, STORE);
  }

  async crearEquipoGuardado({ nombre, color }) {
    validarNoVacio(nombre, 'nombre');
    this._validarColor(color);

    const ts = ahora();
    const equipo = {
      id: nuevoId(),
      nombre,
      color,
      created_at: ts,
      updated_at: ts
    };

    if (this.modo === 'supabase') {
      return this.agregarRegistro(equipo);
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.agregar(tx, equipo);
    });

    return equipo;
  }

  async actualizarEquipoGuardado(equipoId, cambios) {
    const actual = await this.obtener(equipoId);
    if (!actual) throw new NoEncontradoError('EquipoGuardado', equipoId);

    const actualizado = { ...actual };

    if (Object.prototype.hasOwnProperty.call(cambios, 'nombre')) {
      validarNoVacio(cambios.nombre, 'nombre');
      actualizado.nombre = cambios.nombre;
    }

    if (Object.prototype.hasOwnProperty.call(cambios, 'color')) {
      this._validarColor(cambios.color);
      actualizado.color = cambios.color;
    }

    actualizado.updated_at = ahora();

    if (this.modo === 'supabase') {
      await this.actualizarRegistro(actualizado);
      return actualizado;
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.insertarOActualizar(tx, actualizado);
    });

    return actualizado;
  }

  async eliminarEquipoGuardado(equipoId) {
    const actual = await this.obtener(equipoId);
    if (!actual) throw new NoEncontradoError('EquipoGuardado', equipoId);

    if (this.modo === 'supabase') {
      await this.eliminarRegistro(equipoId);
      return;
    }

    await this.adapter.tx([STORE], 'readwrite', (tx) => {
      this.eliminar(tx, equipoId);
    });
  }

  async obtenerEquipoGuardado(equipoId) {
    return this.obtener(equipoId);
  }

  async listarEquiposGuardados() {
    const todos = await this.listar();
    return todos.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
  }

  _validarColor(color) {
    if (typeof color !== 'string' || !COLOR_REGEX.test(color)) {
      throw new ValidacionError(`color inválido: se espera #RRGGBB, recibido "${color}"`, { campo: 'color' });
    }
  }
}
