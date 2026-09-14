import { test, expect } from '@playwright/test';

test.describe('CUMPEO App - Game Launch Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Juegos and see game cards', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    await expect(page.locator('#page-juegos')).toBeVisible();
    
    // Check that game cards are visible
    const gameCards = page.locator('.game-card');
    await expect(gameCards.first()).toBeVisible();
  });

  test('should launch Trivia Relampago game', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    
    const triviaBtn = page.locator('[data-game="Trivia Relampago"]');
    if (await triviaBtn.isVisible()) {
      await triviaBtn.click();
      await page.waitForTimeout(2000);
      await expect(page.locator('.game-card').first()).toBeVisible();
    }
  });

  test('should have game filter buttons', async ({ page }) => {
    await page.click('[data-path="juegos"]');
    
    // Check for filter buttons
    const filterBtns = page.locator('[data-filter]');
    const count = await filterBtns.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('CUMPEO App - Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new session via API', async ({ page }) => {
    const response = await page.request.post('http://localhost:4000/api/sessions', {
      data: { 
        name: 'E2E Test Session', 
        type: 'individual' 
      }
    });
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('code');
    expect(result.code).toMatch(/^CMP-\d{3}$/);
  });

  test('should fetch sessions list', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/sessions');
    expect(response.ok()).toBeTruthy();
    const sessions = await response.json();
    expect(Array.isArray(sessions)).toBeTruthy();
  });

  test('should get session details', async ({ page }) => {
    // First create a session
    const createRes = await page.request.post('http://localhost:4000/api/sessions', {
      data: { name: 'Detail Test Session', type: 'individual' }
    });
    const { id } = await createRes.json();

    // Get session details
    const response = await page.request.get(`http://localhost:4000/api/sessions/${id}`);
    expect(response.ok()).toBeTruthy();
    const session = await response.json();
    expect(session).toHaveProperty('id', id);
    expect(session).toHaveProperty('teams');
    expect(session.teams.length).toBe(2);
  });
});

test.describe('CUMPEO App - Game Pages Structure', () => {
  const gamePages = [
    { name: 'Trivia Relampago', path: '/games/trivia-relampago/index.html' },
    { name: 'Rosco', path: '/games/rosco/index.html' },
    { name: 'Anti-Trivia', path: '/games/anti-trivia/index.html' },
    { name: 'Memorice', path: '/games/memorice/index.html' },
    { name: 'Pictionary', path: '/games/pictionary/index.html' },
    { name: 'Cancion Incompleta', path: '/games/cancion-incompleta/index.html' },
    { name: 'Enlaces', path: '/games/enlaces/index.html' },
    { name: 'Que Dice', path: '/games/que-dice/index.html' },
    { name: 'Historia Enredada', path: '/games/historia-enredada/index.html' },
  ];

  for (const game of gamePages) {
    test(`should load ${game.name} page`, async ({ page }) => {
      await page.goto(game.path);
      await page.waitForLoadState('networkidle');
      
      // Check that game area exists
      await expect(page.locator('#game-area')).toBeVisible();
      
      // Check that conductor area exists
      await expect(page.locator('#conductor-area')).toBeVisible();
      
      // Check that start button exists
      await expect(page.locator('#btn-start')).toBeVisible();
    });
  }
});

test.describe('CUMPEO App - Game Layout', () => {
  test('should have game area on left and conductor on right', async ({ page }) => {
    await page.goto('/games/trivia-relampago/index.html');
    await page.waitForLoadState('networkidle');
    
    const gameArea = page.locator('#game-area');
    const conductorArea = page.locator('#conductor-area');
    
    await expect(gameArea).toBeVisible();
    await expect(conductorArea).toBeVisible();
    
    // Check positions
    const gameBox = await gameArea.boundingBox();
    const conductorBox = await conductorArea.boundingBox();
    
    if (gameBox && conductorBox) {
      // Game area should be to the left of conductor area
      expect(gameBox.x).toBeLessThan(conductorBox.x);
    }
  });

  test('should have clock in game area', async ({ page }) => {
    await page.goto('/games/trivia-relampago/index.html');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('#clock')).toBeAttached();
  });

  test('should have round and time selectors', async ({ page }) => {
    await page.goto('/games/trivia-relampago/index.html');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('#rounds-select')).toBeVisible();
    await expect(page.locator('#time-select')).toBeVisible();
  });
});

test.describe('CUMPEO App - API Endpoints', () => {
  test('should get games list', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/games');
    expect(response.ok()).toBeTruthy();
    const games = await response.json();
    expect(Array.isArray(games)).toBeTruthy();
  });

  test('should get game state', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/state');
    expect(response.ok()).toBeTruthy();
    const state = await response.json();
    expect(state).toHaveProperty('id', 1);
    expect(state).toHaveProperty('status');
  });

  test('should create a game', async ({ page }) => {
    const response = await page.request.post('http://localhost:4000/api/games', {
      data: { name: 'E2E API Test Game', description: 'Created by Playwright' }
    });
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result).toHaveProperty('id');
  });
});
