import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { emitSystemSocket, offSystemSocket, onSystemSocket } = await import(
  '../src/utils/game/system-socket.js'
);

/** @type {Array<(data: object) => unknown>} */
let registered;
/** @type {Array<(data: object) => unknown>} */
let socketListeners;

function register(handler) {
  registered.push(handler);
  onSystemSocket(handler);
  return handler;
}

function emittedMessage() {
  return globalThis.game.socket.emit.mock.calls[0][1];
}

beforeEach(() => {
  registered = [];
  socketListeners = [];
  globalThis.game.socket = {
    emit: vi.fn(),
    on: vi.fn((_event, listener) => socketListeners.push(listener)),
    off: vi.fn(),
  };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const handler of registered) offSystemSocket(handler);
  vi.restoreAllMocks();
});

describe('emitSystemSocket', () => {
  it('sends over the socket and delivers to the emitting client', async () => {
    const handler = vi.fn();
    register(handler);
    const message = { action: 'triggerDefense', payload: { a: 1 } };

    await emitSystemSocket(message);

    expect(globalThis.game.socket.emit).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.objectContaining(message)
    );
    expect(handler).toHaveBeenCalledWith(expect.objectContaining(message));
  });

  it('still delivers locally when no socket exists', async () => {
    globalThis.game.socket = undefined;
    const handler = vi.fn();
    register(handler);

    await emitSystemSocket({ action: 'createSummonedEntity' });

    expect(handler).toHaveBeenCalled();
  });

  it('delivers to all handlers in parallel', async () => {
    const order = [];
    register(async () => {
      order.push('slow-start');
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('slow-end');
    });
    register(() => {
      order.push('fast');
    });

    await emitSystemSocket({ action: 'triggerDefense' });

    expect(order).toEqual(['slow-start', 'fast', 'slow-end']);
  });

  it('reports a failing handler without dropping the others', async () => {
    const healthy = vi.fn();
    register(() => {
      throw new Error('boom');
    });
    register(healthy);

    await emitSystemSocket({ action: 'triggerDefense' });

    expect(healthy).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('emitSystemSocket — the socket delivers back to the sender', () => {
  it('handles the own message once, not twice', async () => {
    const handler = vi.fn();
    register(handler);

    await emitSystemSocket({ action: 'triggerDefense' });
    for (const listener of socketListeners) listener(emittedMessage());

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('still handles the same message from another client', async () => {
    const handler = vi.fn();
    register(handler);

    await emitSystemSocket({ action: 'triggerDefense' });
    for (const listener of socketListeners) {
      listener({ ...emittedMessage(), _originId: 'other-client' });
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('onSystemSocket / offSystemSocket', () => {
  it('registers a handler only once', async () => {
    const handler = vi.fn();
    register(handler);
    onSystemSocket(handler);

    await emitSystemSocket({ action: 'triggerDefense' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(globalThis.game.socket.off).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.any(Function)
    );
  });

  it('stops local delivery after the handler is removed', async () => {
    const handler = vi.fn();
    register(handler);
    offSystemSocket(handler);

    await emitSystemSocket({ action: 'triggerDefense' });

    expect(handler).not.toHaveBeenCalled();
    expect(globalThis.game.socket.off).toHaveBeenCalledWith(
      'system.shadowrun4e',
      expect.any(Function)
    );
  });

  it('detaches the socket listener it registered for the handler', async () => {
    const handler = vi.fn();
    register(handler);
    const [listener] = socketListeners;

    offSystemSocket(handler);

    expect(globalThis.game.socket.off).toHaveBeenLastCalledWith(
      'system.shadowrun4e',
      listener
    );
  });
});
