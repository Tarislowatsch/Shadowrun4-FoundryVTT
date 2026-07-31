import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { BaseSocketHook } = await import('../../src/hooks/base-socket-hook.js');
const { emitSystemSocket } = await import(
  '../../src/utils/game/system-socket.js'
);

const RETRY_DELAY_MS = 1000;
const BIND_ATTEMPTS = 5;

class RecordingHook extends BaseSocketHook {
  constructor() {
    super();
    this.received = [];
  }

  async _onSocketMessage(data) {
    this.received.push(data.action);
  }
}

/** @type {() => void} */
let fireReady;
/** @type {BaseSocketHook[]} */
let hooks;

function makeSocket() {
  return { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
}

function createHook() {
  const hook = new RecordingHook();
  hooks.push(hook);
  fireReady();
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
  hooks = [];
  fireReady = () => {};
  globalThis.Hooks = {
    once: (_event, callback) => {
      fireReady = callback;
    },
  };
  globalThis.game.socket = makeSocket();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const hook of hooks) hook.dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('BaseSocketHook binding', () => {
  it('attaches to the socket that exists at ready', async () => {
    const hook = createHook();

    expect(globalThis.game.socket.on).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.any(Function)
    );
    await emitSystemSocket({ action: 'triggerDefense' });

    expect(hook.received).toEqual(['triggerDefense']);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('handles local messages even while no socket exists', async () => {
    globalThis.game.socket = undefined;
    const hook = createHook();

    await emitSystemSocket({ action: 'triggerDefense' });

    expect(hook.received).toEqual(['triggerDefense']);
  });

  it('attaches to a socket that only appears after ready', async () => {
    globalThis.game.socket = undefined;
    createHook();

    const socket = makeSocket();
    globalThis.game.socket = socket;
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);

    expect(socket.on).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.any(Function)
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('gives up with a warning when the socket never appears', async () => {
    globalThis.game.socket = undefined;
    createHook();

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * BIND_ATTEMPTS);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('RecordingHook: no socket available')
    );
  });
});

describe('BaseSocketHook.dispose', () => {
  it('stops delivering messages', async () => {
    const hook = createHook();

    hook.dispose();
    await emitSystemSocket({ action: 'triggerDefense' });

    expect(hook.received).toEqual([]);
    expect(globalThis.game.socket.off).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.any(Function)
    );
  });

  it('cancels a pending bind retry', async () => {
    globalThis.game.socket = undefined;
    const hook = createHook();

    hook.dispose();
    const socket = makeSocket();
    globalThis.game.socket = socket;
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * BIND_ATTEMPTS);

    expect(socket.on).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
