import { test, expect } from '@playwright/test';
import { crearPartidaCancionIncompleta, irACOnductor, irAPublica } from './_helpers/cancion-incompleta.js';

test('flujo completo: inicio, turno, iniciar tiempo, detener, acierto', async ({ page, context }) => {
  const codigo = await crearPartidaCancionIncompleta(page, context);
  await irACOnductor(page, codigo);
  await page.getByRole('button', { name: /Iniciar juego/i }).click();
  await expect(page.getByText(/Iniciar turno/i)).toBeVisible();
  await page.getByRole('button', { name: /Iniciar turno/i }).click();
  await expect(page.getByText(/Iniciar tiempo/i)).toBeVisible();
  await page.getByRole('button', { name: /Iniciar tiempo/i }).click();
  await expect(page.getByText(/Detener tiempo/i)).toBeVisible();
  await page.getByRole('button', { name: /Detener tiempo/i }).click();
  await expect(page.getByRole('button', { name: /Correcto/i })).toBeVisible();
  await page.getByRole('button', { name: /Correcto/i }).click();
  await expect(page.getByText(/Ronda 1 \/ 1 — Canción 2\/2/i)).toBeVisible();
});

test('publica muestra timer y marcador', async ({ page, context }) => {
  const codigo = await crearPartidaCancionIncompleta(page, context);
  await irAPublica(page, codigo);
  await expect(page.getByText(/Canción Incompleta/i)).toBeVisible();
  await expect(page.getByText(/Rojo/i)).toBeVisible();
  await expect(page.getByText(/Azul/i)).toBeVisible();
});
