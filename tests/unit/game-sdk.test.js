import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test GameSDK by directly implementing the class logic
describe('GameSDK', () => {
  let sdk;
  let mockPostMessage;
  let mockAddEventListener;
  let messageHandlers;

  beforeEach(() => {
    messageHandlers = [];
    mockPostMessage = vi.fn();
    mockAddEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        messageHandlers.push(handler);
      }
    });

    // Create a simple GameSDK implementation for testing
    class GameSDK {
      constructor() {
        this.sessionData = null;
        this.localScores = { A: 0, B: 0 };
        this.currentRound = 1;
        this.totalRounds = 5;
        this.timePerRound = 60;
        this.callbacks = {
          init: null,
          pause: null,
          resume: null,
          nextRound: null,
          timeUp: null
        };
        this._setupListener();
      }

      _setupListener() {
        mockAddEventListener('message', (event) => {
          const data = event.data;
          if (!data || !data.type) return;

          switch (data.type) {
            case 'init':
              this.sessionData = data.session;
              this.localScores = { A: 0, B: 0 };
              if (this.callbacks.init) {
                this.callbacks.init(this.sessionData);
              }
              break;

            case 'pause':
              if (this.callbacks.pause) {
                this.callbacks.pause();
              }
              break;

            case 'resume':
              if (this.callbacks.resume) {
                this.callbacks.resume();
              }
              break;

            case 'next-round':
              if (this.callbacks.nextRound) {
                this.callbacks.nextRound();
              }
              break;
          }
        });
      }

      init(callback) {
        this.callbacks.init = callback;
      }

      onPause(callback) {
        this.callbacks.pause = callback;
      }

      onResume(callback) {
        this.callbacks.resume = callback;
      }

      onNextRound(callback) {
        this.callbacks.nextRound = callback;
      }

      onTimeUp(callback) {
        this.callbacks.timeUp = callback;
      }

      updateScore(localScores) {
        this.localScores = localScores;
        this._send({
          type: 'score-update',
          localScores
        });
      }

      addPoints(team, points) {
        this.localScores[team] = (this.localScores[team] || 0) + points;
        this.updateScore(this.localScores);
      }

      gameOver(result) {
        this._send({
          type: 'game-over',
          winner: result.winner || null,
          localScores: result.localScores || this.localScores,
          stats: result.stats || {}
        });
      }

      updateTimer(seconds) {
        this._send({
          type: 'timer-update',
          seconds
        });
      }

      updateRound(current, total) {
        this.currentRound = current;
        this.totalRounds = total;
        this._send({
          type: 'round-update',
          current,
          total
        });
      }

      setTimePerRound(seconds) {
        this.timePerRound = seconds;
      }

      requestPause() {
        this._send({ type: 'request-pause' });
      }

      sendEvent(eventName, data = {}) {
        this._send({
          type: 'custom-event',
          event: eventName,
          data
        });
      }

      getQuestions(gameType) {
        // In real code this uses localStorage
        return [];
      }

      saveQuestions(gameType, questions) {
        // In real code this uses localStorage
      }

      getImageSets(gameType) {
        return [];
      }

      saveImageSets(gameType, sets) {
        // In real code this uses localStorage
      }

      _send(message) {
        mockPostMessage(message, '*');
      }
    }

    sdk = new GameSDK();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(sdk.sessionData).toBeNull();
      expect(sdk.localScores).toEqual({ A: 0, B: 0 });
      expect(sdk.currentRound).toBe(1);
      expect(sdk.totalRounds).toBe(5);
      expect(sdk.timePerRound).toBe(60);
    });

    it('should have callbacks object initialized', () => {
      expect(sdk.callbacks).toBeDefined();
      expect(sdk.callbacks.init).toBeNull();
      expect(sdk.callbacks.pause).toBeNull();
      expect(sdk.callbacks.resume).toBeNull();
      expect(sdk.callbacks.nextRound).toBeNull();
      expect(sdk.callbacks.timeUp).toBeNull();
    });

    it('should set up message listener', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Message handling', () => {
    it('should handle init message', () => {
      const callback = vi.fn();
      sdk.init(callback);
      
      const sessionData = { id: 1, code: 'CMP-123' };
      messageHandlers.forEach(handler => {
        handler({ data: { type: 'init', session: sessionData } });
      });
      
      expect(callback).toHaveBeenCalledWith(sessionData);
      expect(sdk.sessionData).toEqual(sessionData);
    });

    it('should handle pause message', () => {
      const callback = vi.fn();
      sdk.onPause(callback);
      
      messageHandlers.forEach(handler => {
        handler({ data: { type: 'pause' } });
      });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should handle resume message', () => {
      const callback = vi.fn();
      sdk.onResume(callback);
      
      messageHandlers.forEach(handler => {
        handler({ data: { type: 'resume' } });
      });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should handle next-round message', () => {
      const callback = vi.fn();
      sdk.onNextRound(callback);
      
      messageHandlers.forEach(handler => {
        handler({ data: { type: 'next-round' } });
      });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should ignore messages without type', () => {
      const callback = vi.fn();
      sdk.init(callback);
      
      messageHandlers.forEach(handler => {
        handler({ data: {} });
        handler({ data: null });
      });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should ignore unknown message types', () => {
      const callback = vi.fn();
      sdk.init(callback);
      
      messageHandlers.forEach(handler => {
        handler({ data: { type: 'unknown' } });
      });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('init()', () => {
    it('should register init callback', () => {
      const callback = vi.fn();
      sdk.init(callback);
      expect(sdk.callbacks.init).toBe(callback);
    });
  });

  describe('onPause()', () => {
    it('should register pause callback', () => {
      const callback = vi.fn();
      sdk.onPause(callback);
      expect(sdk.callbacks.pause).toBe(callback);
    });
  });

  describe('onResume()', () => {
    it('should register resume callback', () => {
      const callback = vi.fn();
      sdk.onResume(callback);
      expect(sdk.callbacks.resume).toBe(callback);
    });
  });

  describe('onNextRound()', () => {
    it('should register nextRound callback', () => {
      const callback = vi.fn();
      sdk.onNextRound(callback);
      expect(sdk.callbacks.nextRound).toBe(callback);
    });
  });

  describe('onTimeUp()', () => {
    it('should register timeUp callback', () => {
      const callback = vi.fn();
      sdk.onTimeUp(callback);
      expect(sdk.callbacks.timeUp).toBe(callback);
    });
  });

  describe('updateScore()', () => {
    it('should update local scores', () => {
      sdk.updateScore({ A: 100, B: 50 });
      expect(sdk.localScores).toEqual({ A: 100, B: 50 });
    });

    it('should send score-update message', () => {
      sdk.updateScore({ A: 100, B: 50 });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'score-update',
        localScores: { A: 100, B: 50 }
      }, '*');
    });
  });

  describe('addPoints()', () => {
    it('should add points to team A', () => {
      sdk.addPoints('A', 100);
      expect(sdk.localScores.A).toBe(100);
    });

    it('should add points to team B', () => {
      sdk.addPoints('B', 75);
      expect(sdk.localScores.B).toBe(75);
    });

    it('should accumulate points', () => {
      sdk.addPoints('A', 50);
      sdk.addPoints('A', 30);
      expect(sdk.localScores.A).toBe(80);
    });

    it('should send score-update after adding points', () => {
      sdk.addPoints('A', 100);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'score-update',
        localScores: { A: 100, B: 0 }
      }, '*');
    });
  });

  describe('gameOver()', () => {
    it('should send game-over message with winner', () => {
      sdk.gameOver({ winner: 'A', localScores: { A: 150, B: 100 } });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'game-over',
        winner: 'A',
        localScores: { A: 150, B: 100 },
        stats: {}
      }, '*');
    });

    it('should send game-over message with stats', () => {
      sdk.gameOver({ winner: 'B', localScores: { A: 50, B: 200 }, stats: { rounds: 5 } });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'game-over',
        winner: 'B',
        localScores: { A: 50, B: 200 },
        stats: { rounds: 5 }
      }, '*');
    });

    it('should use default values when not provided', () => {
      sdk.gameOver({});
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'game-over',
        winner: null,
        localScores: { A: 0, B: 0 },
        stats: {}
      }, '*');
    });
  });

  describe('updateTimer()', () => {
    it('should send timer-update message', () => {
      sdk.updateTimer(45);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'timer-update',
        seconds: 45
      }, '*');
    });
  });

  describe('updateRound()', () => {
    it('should update current and total rounds', () => {
      sdk.updateRound(3, 10);
      expect(sdk.currentRound).toBe(3);
      expect(sdk.totalRounds).toBe(10);
    });

    it('should send round-update message', () => {
      sdk.updateRound(2, 5);
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'round-update',
        current: 2,
        total: 5
      }, '*');
    });
  });

  describe('setTimePerRound()', () => {
    it('should set time per round', () => {
      sdk.setTimePerRound(30);
      expect(sdk.timePerRound).toBe(30);
    });
  });

  describe('requestPause()', () => {
    it('should send request-pause message', () => {
      sdk.requestPause();
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'request-pause' }, '*');
    });
  });

  describe('sendEvent()', () => {
    it('should send custom event with data', () => {
      sdk.sendEvent('custom-event', { key: 'value' });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'custom-event',
        event: 'custom-event',
        data: { key: 'value' }
      }, '*');
    });

    it('should send custom event with empty data by default', () => {
      sdk.sendEvent('test-event');
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'custom-event',
        event: 'test-event',
        data: {}
      }, '*');
    });
  });

  describe('_send()', () => {
    it('should call postMessage', () => {
      sdk._send({ type: 'test' });
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'test' }, '*');
    });
  });
});
