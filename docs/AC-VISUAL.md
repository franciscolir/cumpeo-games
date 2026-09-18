# CUMPEO — Criterios de Aceptación Visuales

**Versión:** 1.0
**Fecha:** 2026-09-18
**Alcance:** Conductor, Pública, Móvil
**Referencias:** `docs/MASTER.md`, `public/console.html`, `public/public.html`, `public/movil.html` (referencia de layout, serán borrados)

---

## 1. Introducción

Este documento define los **criterios de aceptación visuales (AC-VISUAL)** que cada interfaz de CUMPEO debe cumplir. Son verificables manualmente o con Playwright.

**Alcance:**
- **Conductor** (`AC-VISUAL-C-*`): consola del conductor durante la partida.
- **Pública** (`AC-VISUAL-P-*`): pantalla de exposición al público.
- **Móvil** (`AC-VISUAL-M-*`): interfaz del público desde el celular.

**No cubre:**
- Lógica de juego (eso está en `GAMES.md`).
- Contratos de datos (eso está en `MASTER.md`).
- Tests funcionales (eso está en los tests unit/e2e).

---

## 2. Sistema visual de referencia

### 2.1 Paleta de colores (del proyecto actual)

**Material 3 tokens:**
| Token | Valor | Uso típico |
|-------|-------|------------|
| `primary` | `#bb0024` | Acciones principales, marca |
| `primary-container` | `#e41b34` | Fondos de acento |
| `secondary` | `#775a00` | Acentos secundarios |
| `secondary-container` | `#ffc72c` | Botones secundarios, badges |
| `tertiary` | `#00694d` | Estados "éxito" |
| `tertiary-container` | `#008562` | Fondos de éxito |
| `surface` | `#fcf9f8` | Fondo general |
| `surface-container-*` | varios | Cards, inputs |
| `on-surface` | `#1c1b1b` | Texto principal |
| `on-surface-variant` | `#5d3f3e` | Texto secundario |

**Comic tokens (acentos cómic):**
| Token | Valor | Uso típico |
|-------|-------|------------|
| `comicYellow` | `#FFE600` | Highlights, badges |
| `comicRed` | `#FF3344` | Equipo 2, alertas |
| `comicBlue` | `#00D2FF` | Equipo 1, info |
| `comicGreen` | `#00E676` | Estados activos |
| `comicOrange` | `#FF7A00` | Advertencias |
| `paperBg` | `#FDFBF7` | Fondo de papel |

**Colores de equipo (fijos):**
- **Equipo 1:** `comicBlue` (#00D2FF).
- **Equipo 2:** `comicRed` (#FF3344).

### 2.2 Tipografías (del proyecto actual)

| Token | Fuente | Uso |
|-------|--------|-----|
| `display-hero` | **Bangers** | Títulos de pantalla, "CUMPEO" |
| `headline-lg/md/sm` | **Bricolage Grotesque** | Títulos de card, secciones |
| `body-lg/md/sm` | **Plus Jakarta Sans** | Texto general |
| `label-md/lg` | **Plus Jakarta Sans** | Labels, botones |
| `comic-score` | **Bangers** | Puntajes grandes |
| `label-comic-pill` | **Bangers** | Badges, pills |

### 2.3 Sombras cómic (del proyecto actual)

| Token | Valor |
|-------|-------|
| `shadow-comic-sm` | `2px 2px 0 #1c1b1b` |
| `shadow-comic-md` | `3px 3px 0 #1c1b1b` |
| `shadow-comic-lg` | `4px 4px 0 #1c1b1b` |
| `shadow-comic-xl` | `6px 6px 0 #1c1b1b` |

### 2.4 Formas (del proyecto actual)

- **Botones:** `border-radius: 12px 22px 14px 20px / 22px 12px 20px 14px` (irregular cómic).
- **Botones alternados:** `20px 12px 22px 14px / 12px 20px 14px 22px`.
- **Inputs:** `border-radius: 10px 18px 12px 16px / 18px 10px 16px 12px`.
- **Bordes:** grosor `2.5px` o `3px`, color `on-surface` (#1c1b1b).
- **Cards:** `rounded-2xl`, borde `2.5px`, `shadow-comic-md`.

### 2.5 Componentes existentes a reutilizar

| Componente | Archivo | Uso |
|------------|---------|-----|
| `Boton` | `src/ui/components/boton.js` | Botones (4 variantes) |
| `Card` | `src/ui/components/card.js` | Tarjetas con título |
| `Header` | `src/ui/components/header.js` | Header con toggle tema |
| `Input` | `src/ui/components/input.js` | Inputs de formulario |

---

## 3. Criterios de aceptación — Conductor

### Layout

El shell del conductor ocupa **pantalla completa** y sigue esta estructura:
┌──────────────────────────────────────────────────┐
│ HEADER: CUMPEO + partida + marcador + acciones │
├──────────────────────────────────────────────────┤
│ │
│ ÁREA DE JUEGO │
│ (GameUI.areaJuego) │
│ │
├──────────────────────────────────────────────────┤
│ PANEL CONDUCTOR │
│ (GameUI.panelConductor + acciones) │
└──────────────────────────────────────────────────┘
### Criterios

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-C-01** | El marcador de ambos equipos permanece visible en la cabecera durante todo el juego. | Inspección visual + screenshot |
| **AC-VISUAL-C-02** | El área de juego ocupa al menos el 50% del viewport vertical (excluyendo header y footer). | Medición con DevTools |
| **AC-VISUAL-C-03** | El panel del conductor está siempre visible (sin scroll). | Inspección visual |
| **AC-VISUAL-C-04** | El color del Equipo 1 es `comicBlue` (#00D2FF) y del Equipo 2 es `comicRed` (#FF3344), consistente en todas las pantallas. | Inspección visual |
| **AC-VISUAL-C-05** | Los botones usan la forma irregular cómic (no rectangular). | Inspección de CSS |
| **AC-VISUAL-C-06** | El estado del juego (EN_CURSO, PAUSADO, etc.) es visible en todo momento. | Inspección visual |
| **AC-VISUAL-C-07** | Cuando el conductor no tiene el control de la partida, el panel de acciones muestra un mensaje explícito y oculta los botones de acción. | Test funcional + inspección |
| **AC-VISUAL-C-08** | Los botones de acción global (pausar, finalizar, descartar) están agrupados visualmente. | Inspección visual |
| **AC-VISUAL-C-09** | El shell no muestra ningún dato interno sensible (`session_id` completo, `action_id`, `lease`). | Búsqueda en HTML renderizado |
| **AC-VISUAL-C-10** | El botón de "Ver pantalla pública" abre una nueva pestaña (`target="_blank"`). | Test funcional |

---

## 4. Criterios de aceptación — Pública

### Layout (extraído de `public/public.html`)
┌──────────────────────────────────────────────────┐
│ HEADER: CUMPEO + badge estado + PIN + conexión │
├────────────────────────────┬─────────────────────┤
│ │ │
│ ESCENARIO PRINCIPAL │ MARCADOR │
│ (imagen / juego) │ │
│ ├─────────────────────┤
│ │ PRÓXIMO DESAFÍO │
│ ├─────────────────────┤
│ │ │
│ │ GALERÍA | QR │
│ │ │
├────────────────────────────┴─────────────────────┤
│ MARQUEE (mensajes rotativos) │
└──────────────────────────────────────────────────┘
### Criterios

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-P-01** | La pantalla pública **nunca** muestra botones de control del conductor. | Búsqueda en HTML renderizado |
| **AC-VISUAL-P-02** | El marcador de ambos equipos permanece visible durante todo el juego. | Inspección visual + screenshot |
| **AC-VISUAL-P-03** | El color del Equipo 1 es `comicBlue` y del Equipo 2 es `comicRed`. | Inspección visual |
| **AC-VISUAL-P-04** | El PIN de conexión es visible en el header y en el QR. | Inspección visual |
| **AC-VISUAL-P-05** | El QR se regenera automáticamente si cambia el PIN. | Test funcional |
| **AC-VISUAL-P-06** | La galería de fotos rota cada 5 segundos si hay más de 1 foto. | Test funcional + inspección |
| **AC-VISUAL-P-07** | El marcador muestra el porcentaje de la barra comparativa en cada lado. | Inspección visual |
| **AC-VISUAL-P-08** | El estado de conexión se refleja con un dot de color (`comicGreen` online, `comicYellow` warn, `comicRed` offline). | Test funcional + inspección |
| **AC-VISUAL-P-09** | El marquee del footer muestra al menos 3 mensajes rotativos. | Inspección visual |
| **AC-VISUAL-P-10** | La pantalla pública **nunca** muestra `session_id`, `action_id`, ni estados internos del juego. | Búsqueda en HTML renderizado |
| **AC-VISUAL-P-11** | El estado "EN JUEGO" muestra el nombre del juego activo en el escenario. | Inspección visual |
| **AC-VISUAL-P-12** | Cuando no hay partida activa, se muestra "ESPERANDO INICIO DE JUEGO" en el próximo desafío. | Test funcional + inspección |

---

## 5. Criterios de aceptación — Móvil

### Layout (extraído de `public/movil.html`)
┌─────────────────────────────┐
│ HEADER: CUMPEO + nombre │
├─────────────────────────────┤
│ │
│ JUEGO ACTUAL │
│ │
│ MARCADOR │
│ 🔵 Equipo 1 18 │
│ 🔴 Equipo 2 15 │
│ │
├─────────────────────────────┤
│ ACCIONES │
│ 💬 Mensaje │
│ 📷 Foto │
│ 📢 Encuesta (si activa) │
└─────────────────────────────┘

### Criterios

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-M-01** | El móvil **nunca** muestra los controles del conductor. | Búsqueda en HTML renderizado |
| **AC-VISUAL-M-02** | El móvil **nunca** muestra la dinámica completa del juego. | Inspección visual |
| **AC-VISUAL-M-03** | El marcador de ambos equipos permanece visible. | Inspección visual |
| **AC-VISUAL-M-04** | El color del Equipo 1 es `comicBlue` y del Equipo 2 es `comicRed`. | Inspección visual |
| **AC-VISUAL-M-05** | El nombre del juego actual es visible en todo momento. | Inspección visual |
| **AC-VISUAL-M-06** | La encuesta activa muestra la pregunta + opciones A/B en primer plano. | Test funcional + inspección |
| **AC-VISUAL-M-07** | Tras responder una encuesta, el móvil muestra solo confirmación ("Respuesta enviada"). | Test funcional + inspección |
| **AC-VISUAL-M-08** | El móvil **nunca** muestra conteo en vivo de respuestas de otros usuarios. | Búsqueda en HTML renderizado |
| **AC-VISUAL-M-09** | El móvil no muestra la identidad de otros participantes. | Búsqueda en HTML renderizado |
| **AC-VISUAL-M-10** | El botón de "Enviar mensaje" y "Enviar foto" están visibles siempre (excepto durante encuesta). | Inspección visual |

---

## 6. Criterios transversales

### 6.1 Consistencia

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-X-01** | Los colores de equipo son idénticos en las 3 interfaces. | Comparación visual |
| **AC-VISUAL-X-02** | Las tipografías respetan el sistema definido (Bangers, Bricolage Grotesque, Plus Jakarta Sans). | Inspección de CSS |
| **AC-VISUAL-X-03** | Los botones usan la misma forma irregular cómic en las 3 interfaces. | Inspección de CSS |
| **AC-VISUAL-X-04** | El marcador se ve igual en tamaño y color en Conductor y Pública. | Comparación visual |

### 6.2 Rendimiento visual

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-X-05** | La UI responde visualmente en menos de 500ms tras una acción (feedback visual inmediato). | Inspección con DevTools Performance |
| **AC-VISUAL-X-06** | Los cambios de estado (juego, marcador) se reflejan en menos de 2s en la Pública. | Test funcional |

### 6.3 Accesibilidad

| # | Criterio | Verificación |
|---|----------|--------------|
| **AC-VISUAL-X-07** | El contraste de texto sobre fondo cumple WCAG AA (ratio ≥ 4.5:1). | Inspección con Lighthouse |
| **AC-VISUAL-X-08** | Los elementos interactivos tienen `aria-label` o texto visible. | Inspección de HTML |
| **AC-VISUAL-X-09** | Las animaciones respetan `prefers-reduced-motion`. | Inspección de CSS |

---

## 7. Cómo se verifica cada AC

| Método | Cuándo | Herramienta |
|--------|--------|-------------|
| **Inspección visual** | Manual, en dev | Navegador + DevTools |
| **Screenshot** | En el paso de cierre de cada bloque | Playwright |
| **Test funcional** | En tests e2e | Playwright |
| **Búsqueda en HTML renderizado** | En tests e2e | Playwright (`expect(page.content()).not.toContain(...)`) |
| **Lighthouse** | En cierre de Bloque 2 (auditoría completa) | Lighthouse CLI |

---

## 8. Roadmap de aplicación

| Bloque | ACs a cumplir |
|--------|---------------|
| Bloque 2 (Shell) | `AC-VISUAL-C-01..10`, `AC-VISUAL-P-01..12`, `AC-VISUAL-X-01..09` |
| Bloque 3 (Móvil) | `AC-VISUAL-M-01..10` |
| Bloque 4 (Juego) | Todos los ACs de las 3 interfaces |

---

## 9. Referencias

- `docs/MASTER.md` — modelo conceptual, invariantes, decisiones.
- `public/console.html` — referencia de layout del conductor (será borrado).
- `public/public.html` — referencia de layout de la pública (será borrado).
- `public/movil.html` — referencia de layout del móvil (será borrado).
- `tailwind.config.js` — paleta y tipografías.
- `src/styles/comic.css` — formas irregulares, animaciones.

---

**Fin del documento AC-VISUAL v1.0**