import './styles/tailwind.css';
import './styles/theme.css';
import './styles/comic.css';

import { LocalAdapter } from './adapters/LocalAdapter.js';
import { bootstrap } from './app/bootstrap.js';
import { Router } from './ui/router.js';
import { applyTheme, resolveTheme } from './ui/theme.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderListaCircuitos } from './ui/circuitos/lista.js';
import { renderFormularioCircuito } from './ui/circuitos/formulario.js';
import { renderListaSets } from './ui/sets/lista.js';
import { renderFormularioSet } from './ui/sets/formulario.js';
import { renderListaPartidas } from './ui/partidas/lista.js';
import { renderNuevaPartida } from './ui/partidas/nueva.js';
import { renderConsolaPartida } from './ui/partidas/consola.js';

/* =============================================================
   Tema
   ============================================================= */
applyTheme(resolveTheme());
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('cumpeo.tema')) return;
  applyTheme(e.matches ? 'dark' : 'light');
});

/* =============================================================
   Router
   ============================================================= */
const router = new Router();
router.registrar('#/', renderDashboard);
router.registrar('#/circuitos', renderListaCircuitos);
router.registrar('#/circuitos/nuevo', (c, a) => renderFormularioCircuito(c, a, {}));
router.registrar('#/circuitos/:id', (c, a, p) => renderFormularioCircuito(c, a, p));
router.registrar('#/sets', renderListaSets);
router.registrar('#/sets/nuevo', (c, a) => renderFormularioSet(c, a, {}));
router.registrar('#/sets/:id', (c, a, p) => renderFormularioSet(c, a, p));
router.registrar('#/partidas', renderListaPartidas);
router.registrar('#/partidas/nueva', renderNuevaPartida);
router.registrar('#/partidas/:id', renderConsolaPartida);
router.setNotFound((c) => {
  c.innerHTML = `<main class="min-h-screen p-6"><h1 class="font-display-hero text-4xl">404</h1><p class="mt-4">Ruta no encontrada</p></main>`;
});

/* =============================================================
   Boot
   ============================================================= */
const app = document.getElementById('app');

async function boot() {
  app.innerHTML = `
    <main class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
        <div class="inline-block bg-primary text-on-primary font-display-hero text-5xl px-4 py-2 border-3 border-on-surface shadow-comic-sm -rotate-2 uppercase">
          CUMPEO
        </div>
        <p class="font-body-md text-on-surface-variant mt-4" id="boot-status">
          Abriendo base de datos…
        </p>
      </div>
    </main>
  `;

  const status = document.getElementById('boot-status');
  const adapter = new LocalAdapter();

  try {
    await adapter.abrir();
    const cumpeoApp = await bootstrap(adapter);
    await router.iniciar(app, cumpeoApp);
  } catch (err) {
    console.error('[boot] Error:', err);
    status.innerHTML = `
      <span class="font-label-md uppercase text-error">ERROR</span><br>
      ${err.message || 'Error inicializando'}
    `;
  }
}

boot();
