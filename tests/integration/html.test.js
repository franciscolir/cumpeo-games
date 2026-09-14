import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('HTML Integrity', () => {
  let indexHtml;
  let publicHtml;

  beforeAll(async () => {
    const indexPath = join(__dirname, '..', '..', 'public', 'index.html');
    const publicPath = join(__dirname, '..', '..', 'public', 'public.html');
    const fs = await import('fs');
    indexHtml = fs.readFileSync(indexPath, 'utf8');
    publicHtml = fs.readFileSync(publicPath, 'utf8');
  });

  describe('index.html structure', () => {
    it('should have balanced div tags (or off by 1)', () => {
      const opens = (indexHtml.match(/<div[\s>]/g) || []).length;
      const closes = (indexHtml.match(/<\/div>/g) || []).length;
      expect(Math.abs(opens - closes)).toBeLessThanOrEqual(1);
    });

    it('should have balanced section tags', () => {
      const opens = (indexHtml.match(/<section[\s>]/g) || []).length;
      const closes = (indexHtml.match(/<\/section>/g) || []).length;
      expect(opens).toBe(closes);
    });

    it('should have all required page sections', () => {
      expect(indexHtml).toContain('id="page-inicio"');
      expect(indexHtml).toContain('id="page-juegos"');
      expect(indexHtml).toContain('id="page-circuitos"');
      expect(indexHtml).toContain('id="page-dashboard"');
      expect(indexHtml).toContain('id="page-extras"');
      expect(indexHtml).toContain('id="page-configuracion"');
    });

    it('should have all 5 circuit wizard steps', () => {
      expect(indexHtml).toContain('id="circ-step-1"');
      expect(indexHtml).toContain('id="circ-step-2"');
      expect(indexHtml).toContain('id="circ-step-3"');
      expect(indexHtml).toContain('id="circ-step-4"');
      expect(indexHtml).toContain('id="circ-step-5"');
    });

    it('should have navigation links', () => {
      expect(indexHtml).toContain('data-path="inicio"');
      expect(indexHtml).toContain('data-path="juegos"');
      expect(indexHtml).toContain('data-path="circuitos"');
      expect(indexHtml).toContain('data-path="extras"');
      expect(indexHtml).toContain('data-path="configuracion"');
    });

    it('should have dashboard control buttons', () => {
      expect(indexHtml).toContain('id="dash-btn-start"');
      expect(indexHtml).toContain('id="dash-btn-pause"');
      expect(indexHtml).toContain('id="dash-btn-time"');
      expect(indexHtml).toContain('id="dash-btn-next"');
      expect(indexHtml).toContain('id="dash-btn-reset"');
      expect(indexHtml).toContain('id="dash-btn-sound"');
      expect(indexHtml).toContain('id="dash-btn-confetti"');
      expect(indexHtml).toContain('id="dash-btn-countdown"');
      expect(indexHtml).toContain('id="dash-effect-feedback"');
    });

    it('should have step navigation buttons', () => {
      expect(indexHtml).toContain('id="circ-back-step2"');
      expect(indexHtml).toContain('id="circ-continue-step2"');
      expect(indexHtml).toContain('id="circ-back-step3"');
      expect(indexHtml).toContain('id="circ-continue-step3"');
      expect(indexHtml).toContain('id="circ-back-step4"');
      expect(indexHtml).toContain('id="circ-continue-step4"');
      expect(indexHtml).toContain('id="circ-back-step5"');
      expect(indexHtml).toContain('id="circ-launch"');
    });

    it('should have API base URL configured', () => {
      expect(indexHtml).toContain('localhost:4000/api');
    });

    it('should reference local mascot images', () => {
      expect(indexHtml).toContain('images/pupi-pulgar-arriba.png');
      expect(indexHtml).toContain('images/pupi-riendo.png');
      expect(indexHtml).toContain('images/pupi-tarjeta.png');
    });

    it('should have Tailwind config with custom colors', () => {
      expect(indexHtml).toContain('tailwind.config');
      expect(indexHtml).toContain('primary:');
      expect(indexHtml).toContain('secondary:');
      expect(indexHtml).toContain('tertiary:');
    });

    it('should have proper script initialization', () => {
      expect(indexHtml).toContain('init()');
      expect(indexHtml).toContain('setupEventListeners()');
      expect(indexHtml).toContain('navigateTo(');
    });
  });

  describe('public.html structure', () => {
    it('should have balanced div tags (or off by 1)', () => {
      const opens = (publicHtml.match(/<div[\s>]/g) || []).length;
      const closes = (publicHtml.match(/<\/div>/g) || []).length;
      expect(Math.abs(opens - closes)).toBeLessThanOrEqual(1);
    });

    it('should have balanced section tags', () => {
      const opens = (publicHtml.match(/<section[\s>]/g) || []).length;
      const closes = (publicHtml.match(/<\/section>/g) || []).length;
      expect(opens).toBe(closes);
    });

    it('should have public display structure', () => {
      expect(publicHtml).toContain('CUMPEO');
    });
  });
});

describe('File Structure Integrity', () => {
  it('should have required server files', async () => {
    const fs = await import('fs');
    const base = join(__dirname, '..', '..');
    expect(fs.existsSync(join(base, 'server', 'server.js'))).toBe(true);
    expect(fs.existsSync(join(base, 'server', 'db.js'))).toBe(true);
    expect(fs.existsSync(join(base, 'package.json'))).toBe(true);
  });

  it('should have database file', async () => {
    const fs = await import('fs');
    const dbPath = join(__dirname, '..', '..', 'db', 'cumpeo.sqlite');
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('should have mascot images', async () => {
    const fs = await import('fs');
    const imagesDir = join(__dirname, '..', '..', 'public', 'images');
    expect(fs.existsSync(imagesDir)).toBe(true);
    expect(fs.existsSync(join(imagesDir, 'pupi-pulgar-arriba.png'))).toBe(true);
    expect(fs.existsSync(join(imagesDir, 'pupi-microfono.png'))).toBe(true);
    expect(fs.existsSync(join(imagesDir, 'pupi-riendo.png'))).toBe(true);
    expect(fs.existsSync(join(imagesDir, 'pupi-tarjeta.png'))).toBe(true);
  });

  it('should have package.json with required dependencies', async () => {
    const fs = await import('fs');
    const pkg = JSON.parse(fs.readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
    expect(pkg.dependencies).toHaveProperty('express');
    expect(pkg.dependencies).toHaveProperty('sql.js');
    expect(pkg.dependencies).toHaveProperty('cors');
    expect(pkg.type).toBe('module');
  });
});
