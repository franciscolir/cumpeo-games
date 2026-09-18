/* =============================================================
   Login — pantalla de autenticación con Magic Link.
   ============================================================= */

/**
 * Renderiza la pantalla de login.
 * @param {HTMLElement} container
 * @param {object} opciones
 * @param {function} opciones.onLoginExitoso - Callback cuando el usuario completa el login.
 */
export function renderLogin(container, { onLoginExitoso }) {
  container.innerHTML = `
    <main class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-surface-container-lowest border-2.5 border-on-surface rounded-2xl p-8 shadow-comic-lg text-center">
        <div class="inline-block bg-primary text-on-primary font-display-hero text-5xl px-4 py-2 border-3 border-on-surface shadow-comic-sm -rotate-2 uppercase mb-6">
          CUMPEO
        </div>

        <h2 class="font-headline-md text-on-surface mb-4">Iniciar sesión</h2>
        <p class="font-body-md text-on-surface-variant mb-6">
          Ingresá tu email para recibir un link de acceso.
        </p>

        <form id="login-form" class="space-y-4">
          <div>
            <input
              type="email"
              id="login-email"
              placeholder="tu@email.com"
              required
              class="w-full font-body-md border-2.5 border-on-surface rounded-lg px-4 py-3 bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            id="login-submit"
            class="w-full font-label-md uppercase border-2.5 border-on-surface rounded-lg px-4 py-3 bg-primary text-on-primary shadow-comic-sm hover:shadow-comic-md transition"
          >
            Enviar magic link
          </button>
        </form>

        <div id="login-mensaje" class="mt-4 hidden">
          <p class="font-body-md text-tertiary font-bold">Revisá tu email</p>
          <p class="font-body-sm text-on-surface-variant mt-1">
            Te enviamos un link para acceder. Hacé clic en él para continuar.
          </p>
        </div>

        <div id="login-error" class="mt-4 hidden">
          <p class="font-body-md text-error"></p>
        </div>
      </div>
    </main>
  `;

  const form = container.querySelector('#login-form');
  const emailInput = container.querySelector('#login-email');
  const submitBtn = container.querySelector('#login-submit');
  const mensajeDiv = container.querySelector('#login-mensaje');
  const errorDiv = container.querySelector('#login-error');
  const errorText = errorDiv.querySelector('p');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    errorDiv.classList.add('hidden');
    mensajeDiv.classList.add('hidden');

    const { loginConMagicLink } = await import('../app/auth.js');
    const resultado = await loginConMagicLink(email);

    if (resultado.ok) {
      form.classList.add('hidden');
      mensajeDiv.classList.remove('hidden');
    } else {
      errorText.textContent = resultado.error || 'Error al enviar el magic link.';
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar magic link';
    }
  });
}
