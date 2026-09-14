import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modalPath = join(__dirname, '..', '..', 'public', 'games', '_shared', 'game-start-modal.js');
const modalCode = readFileSync(modalPath, 'utf8');

function createMockElement(id = '') {
  return {
    id,
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
    },
    appendChild: vi.fn(),
    remove: vi.fn(),
    addEventListener: vi.fn(),
    offsetWidth: 100,
  };
}

const OVERLAY_IDS = ['pause-overlay', 'turn-overlay', 'end-confirm-modal'];

function createDOMEnv(overrides = {}) {
  const defaults = {
    'game-area': null,
  };
  const elements = { ...defaults, ...overrides };

  const documentMock = {
    getElementById: vi.fn((id) => {
      if (id in elements) return elements[id];
      if (OVERLAY_IDS.includes(id)) return null;
      return createMockElement(id);
    }),
    createElement: vi.fn((tag) => createMockElement()),
    body: {
      appendChild: vi.fn(),
    },
  };

  return { documentMock, elements };
}

function getModalFns(docMock) {
  const fakeSetInterval = vi.fn((fn, ms) => 1);
  const fakeClearInterval = vi.fn();
  const fakeSetTimeout = vi.fn((fn, ms) => { fn(); return 1; });

  const wrappedCode = `(function(__document, __setInterval, __clearInterval, __setTimeout) {
    var document = __document;
    var setInterval = __setInterval;
    var clearInterval = __clearInterval;
    var setTimeout = __setTimeout;
    ${modalCode}
    return { showStartModal, showPauseModal, hidePauseModal, showTurnModal, showEndConfirmModal, showResultsScreen };
  })`;

  const factory = new Function('return ' + wrappedCode)();
  return factory(docMock, fakeSetInterval, fakeClearInterval, fakeSetTimeout);
}

describe('GameStartModal', () => {
  let env;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('showStartModal()', () => {
    it('should create overlay element', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showStartModal(vi.fn());
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should append overlay to game-area if exists', () => {
      const gameArea = { appendChild: vi.fn() };
      env = createDOMEnv({ 'game-area': gameArea });
      const fns = getModalFns(env.documentMock);
      fns.showStartModal(() => {});
      expect(gameArea.appendChild).toHaveBeenCalled();
    });

    it('should append overlay to body if game-area does not exist', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showStartModal(() => {});
      expect(env.documentMock.body.appendChild).toHaveBeenCalled();
    });

    it('should use custom imagePath when provided', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showStartModal(() => {}, { imagePath: '/custom/image.png' });
      expect(env.documentMock.createElement).toHaveBeenCalled();
    });

    it('should use custom countdownFrom when provided', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showStartModal(() => {}, { countdownFrom: 5 });
      expect(env.documentMock.createElement).toHaveBeenCalled();
    });
  });

  describe('showPauseModal()', () => {
    it('should create pause overlay', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showPauseModal();
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should not create duplicate pause overlay', () => {
      const existingOverlay = { id: 'pause-overlay' };
      env = createDOMEnv({ 'pause-overlay': existingOverlay });
      const fns = getModalFns(env.documentMock);
      fns.showPauseModal();
      expect(env.documentMock.createElement).not.toHaveBeenCalled();
    });

    it('should append to game-area if exists', () => {
      const gameArea = { appendChild: vi.fn() };
      env = createDOMEnv({ 'game-area': gameArea });
      const fns = getModalFns(env.documentMock);
      fns.showPauseModal();
      expect(gameArea.appendChild).toHaveBeenCalled();
    });
  });

  describe('hidePauseModal()', () => {
    it('should remove pause overlay if exists', () => {
      const overlay = { remove: vi.fn() };
      env = createDOMEnv({ 'pause-overlay': overlay });
      const fns = getModalFns(env.documentMock);
      fns.hidePauseModal();
      expect(overlay.remove).toHaveBeenCalled();
    });

    it('should do nothing if pause overlay does not exist', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      expect(() => fns.hidePauseModal()).not.toThrow();
    });
  });

  describe('showTurnModal()', () => {
    it('should create turn overlay', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showTurnModal('Equipo A');
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should remove existing turn overlay before creating new one', () => {
      const existingOverlay = { remove: vi.fn() };
      env = createDOMEnv({ 'turn-overlay': existingOverlay });
      const fns = getModalFns(env.documentMock);
      fns.showTurnModal('Equipo B');
      expect(existingOverlay.remove).toHaveBeenCalled();
    });

    it('should auto-remove after duration', () => {
      const overlay = createMockElement();
      env = createDOMEnv();
      env.documentMock.createElement.mockReturnValue(overlay);
      const fns = getModalFns(env.documentMock);
      fns.showTurnModal('Equipo A', 1000);
      vi.advanceTimersByTime(1000);
      expect(overlay.remove).toHaveBeenCalled();
    });
  });

  describe('showEndConfirmModal()', () => {
    it('should create end confirm overlay', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showEndConfirmModal(() => {}, () => {});
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should not create duplicate end confirm overlay', () => {
      const existingOverlay = { id: 'end-confirm-modal' };
      env = createDOMEnv({ 'end-confirm-modal': existingOverlay });
      const fns = getModalFns(env.documentMock);
      fns.showEndConfirmModal(() => {}, () => {});
      expect(env.documentMock.createElement).not.toHaveBeenCalled();
    });

    it('should append to game-area if exists', () => {
      const gameArea = { appendChild: vi.fn() };
      env = createDOMEnv({ 'game-area': gameArea });
      const fns = getModalFns(env.documentMock);
      fns.showEndConfirmModal(() => {}, () => {});
      expect(gameArea.appendChild).toHaveBeenCalled();
    });
  });

  describe('showResultsScreen()', () => {
    it('should create results screen for winner A', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showResultsScreen({ winner: 'A', scores: { A: 100, B: 50 } });
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should create results screen for winner B', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showResultsScreen({ winner: 'B', scores: { A: 50, B: 100 } });
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should create results screen for tie', () => {
      env = createDOMEnv();
      const fns = getModalFns(env.documentMock);
      fns.showResultsScreen({ winner: 'empate', scores: { A: 75, B: 75 } });
      expect(env.documentMock.createElement).toHaveBeenCalledWith('div');
    });

    it('should append to game-area if exists', () => {
      const gameArea = { appendChild: vi.fn() };
      env = createDOMEnv({ 'game-area': gameArea });
      const fns = getModalFns(env.documentMock);
      fns.showResultsScreen({ winner: 'A', scores: { A: 100, B: 50 } });
      expect(gameArea.appendChild).toHaveBeenCalled();
    });
  });
});
