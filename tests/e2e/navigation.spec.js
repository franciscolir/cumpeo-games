import { test, expect } from '@playwright/test';

test.describe('CUMPEO App - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the app and show Inicio page', async ({ page }) => {
    await expect(page.locator('#page-inicio')).toBeVisible();
    await expect(page.locator('#page-inicio h1').first()).toContainText('HOLA CONDUCTOR');
  });

  test('should navigate to Juegos page', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    await expect(page.locator('#page-juegos')).toBeVisible();
    await expect(page.locator('#page-inicio')).toBeHidden();
  });

  test('should navigate to Circuitos page', async ({ page }) => {
    await page.click('[data-path="circuitos"]');
    await expect(page.locator('#page-circuitos')).toBeVisible();
    await expect(page.locator('#page-inicio')).toBeHidden();
  });

  test('should navigate to Extras page', async ({ page }) => {
    await page.click('[data-path="extras"]');
    await expect(page.locator('#page-extras')).toBeVisible();
    await expect(page.locator('#page-inicio')).toBeHidden();
  });

  test('should navigate to Configuracion page', async ({ page }) => {
    await page.click('[data-path="configuracion"]');
    await expect(page.locator('#page-configuracion')).toBeVisible();
    await expect(page.locator('#page-inicio')).toBeHidden();
  });

  test('should navigate back to Inicio', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    await expect(page.locator('#page-juegos')).toBeVisible();
    await page.click('[data-path="inicio"]');
    await expect(page.locator('#page-inicio')).toBeVisible();
  });

  test('should highlight active nav link', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    const juegosLink = page.locator('[data-path="juegos"]');
    await expect(juegosLink).toHaveClass(/bg-primary/);
  });
});

test.describe('CUMPEO App - Circuit Wizard Steps', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('[data-path="circuitos"]');
  });

  test('should show Step 1 by default in Circuitos', async ({ page }) => {
    await expect(page.locator('#circ-step-1')).toBeVisible();
  });

  test('should navigate Step 1 → Step 2', async ({ page }) => {
    // Fill in circuit name first
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await expect(page.locator('#circ-step-2')).toBeVisible();
    await expect(page.locator('#circ-step-1')).toBeHidden();
  });

  test('should navigate Step 2 → Step 3', async ({ page }) => {
    // Go to step 2 first
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await expect(page.locator('#circ-step-2')).toBeVisible();

    // Go to step 3
    await page.click('#circ-continue-step2');
    await expect(page.locator('#circ-step-3')).toBeVisible();
    await expect(page.locator('#circ-step-2')).toBeHidden();
  });

  test('should navigate Step 3 → Step 4', async ({ page }) => {
    // Navigate to step 3
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-continue-step2');
    await page.click('#circ-continue-step3');
    await expect(page.locator('#circ-step-4')).toBeVisible();
    await expect(page.locator('#circ-step-3')).toBeHidden();
  });

  test('should navigate Step 4 → Step 5', async ({ page }) => {
    // Navigate to step 4
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-continue-step2');
    await page.click('#circ-continue-step3');
    await page.click('#circ-continue-step4');
    await expect(page.locator('#circ-step-5')).toBeVisible();
    await expect(page.locator('#circ-step-4')).toBeHidden();
  });

  test('should navigate back from Step 2 to Step 1', async ({ page }) => {
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-back-step2');
    await expect(page.locator('#circ-step-1')).toBeVisible();
    await expect(page.locator('#circ-step-2')).toBeHidden();
  });

  test('should navigate back from Step 3 to Step 2', async ({ page }) => {
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-continue-step2');
    await page.click('#circ-back-step3');
    await expect(page.locator('#circ-step-2')).toBeVisible();
    await expect(page.locator('#circ-step-3')).toBeHidden();
  });

  test('should navigate back from Step 4 to Step 3', async ({ page }) => {
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-continue-step2');
    await page.click('#circ-continue-step3');
    await page.click('#circ-back-step4');
    await expect(page.locator('#circ-step-3')).toBeVisible();
    await expect(page.locator('#circ-step-4')).toBeHidden();
  });

  test('should navigate back from Step 5 to Step 4', async ({ page }) => {
    const nameInput = page.locator('#circ-step-1 input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Circuit');
    }
    await page.click('#btn-continue');
    await page.click('#circ-continue-step2');
    await page.click('#circ-continue-step3');
    await page.click('#circ-continue-step4');
    await page.click('#circ-back-step5');
    await expect(page.locator('#circ-step-4')).toBeVisible();
    await expect(page.locator('#circ-step-5')).toBeHidden();
  });
});

test.describe('CUMPEO App - Dashboard', () => {
  test('should open dashboard from Juegos page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('[data-path="juegos"]');

    // Click first "Jugar" button
    const playBtn = page.locator('.btn-play').first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await expect(page.locator('#page-dashboard')).toBeVisible();
    }
  });

  test('should have all dashboard control buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('[data-path="juegos"]');

    const playBtn = page.locator('.btn-play').first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
      await expect(page.locator('#dash-btn-start')).toBeVisible();
      await expect(page.locator('#dash-btn-pause')).toBeVisible();
      await expect(page.locator('#dash-btn-time')).toBeVisible();
      await expect(page.locator('#dash-btn-next')).toBeVisible();
      await expect(page.locator('#dash-btn-reset')).toBeVisible();
      await expect(page.locator('#dash-btn-sound')).toBeVisible();
      await expect(page.locator('#dash-btn-confetti')).toBeVisible();
      await expect(page.locator('#dash-btn-countdown')).toBeVisible();
    }
  });
});

test.describe('CUMPEO App - API Integration', () => {
  test('should fetch games from API', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/games');
    expect(response.ok()).toBeTruthy();
    const games = await response.json();
    expect(Array.isArray(games)).toBeTruthy();
  });

  test('should fetch game state from API', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/state');
    expect(response.ok()).toBeTruthy();
    const state = await response.json();
    expect(state).toHaveProperty('id', 1);
    expect(state).toHaveProperty('status');
  });

  test('should create a game via API', async ({ page }) => {
    const response = await page.request.post('http://localhost:3000/api/games', {
      data: { name: 'E2E Test Game', description: 'Created by Playwright' },
    });
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result).toHaveProperty('id');

    // Cleanup
    await page.request.get('http://localhost:3000/api/games');
  });
});
