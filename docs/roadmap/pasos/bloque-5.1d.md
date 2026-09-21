# Bloque 5 — Paso 5.1d: Cierre documental de mecánica de Rosco

**Fecha de cierre:** 2026-09-21
**Resultado:** ✅ APROBADO
**Commits:** (pendiente)

---

## Objetivo

Cerrar la mecánica de Rosco sin código ni tests. Solo se actualizan docs:
GAMES.md, ROADMAP.md, AUDITORIA.md y este archivo de paso.

---

## Mecánica cerrada

### Estructura

| Aspecto | Definición |
|---------|------------|
| Concepto | Preguntas asociadas a letras de un rosco alfabético |
| Set | 27 letras fijas A–Z + Ñ (orden alfabético tradicional español) |
| Alfabeto | NO configurable. Siempre incluye la Ñ |
| Rondas por partida | Configurable (N rondas). 1 rosco = 1 ronda |
| Fin de ronda | Todas las letras resueltas o tiempo agotado; las pendientes cuentan como no resueltas |
| Fin de partida | Tras N rondas configuradas |

### Item del set

```js
{
  letra: 'A',
  definicion: 'Fruta...',
  respuesta: 'Ananá'
}
```

### Validación del set

| Regla | Detalle |
|-------|---------|
| Items requeridos | Debe tener items para las 27 letras |
| Items por letra | Cada letra debe tener al menos N items (N = rondas configuradas) |
| Ejemplo 2 rondas | Mínimo 54 items |
| Ejemplo 3 rondas | Mínimo 81 items |

### Turnos

| Aspecto | Definición |
|---------|------------|
| Jugadores designados | 1 o 2 por equipo |
| Dinámica | Tipo tenis: el equipo responde mientras acierta |
| Cambio de turno | Al errar o al usar pasapalabra |
| Equipo inactivo | Solo entra con error o pasapalabra del otro |
| Pausa entre turnos | El conductor presiona "Siguiente equipo" |
| Robo | NO existe como mecánica separada; la letra pasa al otro equipo como flujo de pasapalabra |

### Letras

| Estado | Descripción |
|--------|-------------|
| Acierto | Queda cerrada como correcta |
| Error | Queda cerrada como incorrecta. No se reintenta |
| Pasapalabra | Pasa al otro equipo; si ambos pasan, queda pendiente hasta la otra vuelta |
| Reanudación | Vuelven al final de la lista; cuando no queden frescas, se retoman las pendientes |
| Valor por letra | Fijo, configurable global |

### Tiempo

| Aspecto | Definición |
|---------|------------|
| Timer | Total de ronda, corre siempre que hay turno activo |
| Pausa | Se pausa con "Siguiente equipo" y se reanuda al arrancar el nuevo turno |
| En pantalla | 2 timers (uno por equipo) |
| Duración | Configurable, default 60s por equipo |
| Fin de tiempo | Termina la ronda; pendientes = no resueltas |

### Puntuación y finalización

| Aspecto | Definición |
|---------|------------|
| Puntos por acierto | Configurable |
| Penalización por error | Configurable |
| Acumulación | Puntuación acumulativa entre rondas |
| Ganador | Mayor puntuación total |
| Desempate | Por letras completadas |

### Validación

| Aspecto | Definición |
|---------|------------|
| Quién valida | El conductor |
| UI | Marca OK o X en la UI |
| Respuesta | Verbal, NO se tipea |

### Intervención del conductor

| Permitido | Prohibido |
|-----------|-----------|
| Pausar/reanudar timer | Retroceder letras ya marcadas |
| Saltar a la siguiente letra | |

### Pública

| Aspecto | Definición |
|---------|------------|
| Rosco | Completo, visible desde el inicio |
| Estado letras | Se llena con el estado de cada letra |
| Progreso | Visible |
| Definición | Se muestra en el CENTRO del rosco |
| Respuesta | Se muestra después de validar |
| Timers | Se muestran los 2 timers |

### Reinicio entre rondas

| Aspecto | Definición |
|---------|------------|
| Rosco | Se limpia (todas las letras vuelven a "pendiente") |
| Pendientes | Se reasignan + se barajan nuevas del set |

---

## Cambios vs. GAMES.md previo

| # | Cambio | Impacto |
|---|--------|---------|
| 1 | Turnos dinámicos tipo tenis | Alto |
| 2 | Público ve la definición en el centro del rosco | Medio |
| 3 | Timer total de ronda, 2 timers en pantalla | Medio |
| 4 | Robo NO existe | Bajo |
| 5 | Set necesita N items por letra para N rondas | Alto |
| 6 | Alfabeto fijo A–Z + Ñ | Bajo |

---

## Veredicto

✅ **APROBADO** — Mecánica de Rosco cerrada. Desglose 5.2a–d definido.
