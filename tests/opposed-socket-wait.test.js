import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TIMEOUT_MS = 1000;

vi.mock('../src/utils/game/opposed-roll-timeout.js', () => ({
  getOpposedRollFallbackTimeoutMs: () => TIMEOUT_MS,
}));

const { awaitOpposedSocketResponse } = await import(
  '../src/utils/game/opposed-socket-wait.js'
);
const { emitSystemSocket, offSystemSocket, onSystemSocket } = await import(
  '../src/utils/game/system-socket.js'
);

const attackerUuid = 'Actor.attacker1';
const defenderUuid = 'Actor.defender1';

/** @type {Array<(data: object) => unknown>} */
let responders;

function waitForDefense() {
  return awaitOpposedSocketResponse({
    triggerAction: 'triggerMatrixDefense',
    triggerPayload: { attackerUuid, defenderUuid },
    matchAction: 'matrixDefenseRolled',
    matches: (payload) =>
      payload?.attackerUuid === attackerUuid &&
      payload?.defenderUuid === defenderUuid,
    onMatch: (payload) => payload.defenseHits ?? 0,
    fallback: 0,
  });
}

function respondWith(payload) {
  const responder = async (data) => {
    if (data.action !== 'triggerMatrixDefense') return;
    await emitSystemSocket({ action: 'matrixDefenseRolled', payload });
  };
  responders.push(responder);
  onSystemSocket(responder);
}

beforeEach(() => {
  responders = [];
  globalThis.game.socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
  globalThis.game.settings = { get: vi.fn().mockReturnValue(20) };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const responder of responders) offSystemSocket(responder);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('awaitOpposedSocketResponse', () => {
  it('resolves with the matching response', async () => {
    respondWith({ attackerUuid, defenderUuid, defenseHits: 2 });

    await expect(waitForDefense()).resolves.toBe(2);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('ignores a response for a different opposed pair', async () => {
    vi.useFakeTimers();
    respondWith({ attackerUuid, defenderUuid: 'Actor.someoneElse' });

    const pending = waitForDefense();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toBe(0);
  });

  it('falls back once the timeout elapses and says so', async () => {
    vi.useFakeTimers();

    const pending = waitForDefense();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('no matrixDefenseRolled')
    );
  });

  it('keeps the fallback when the response arrives too late', async () => {
    vi.useFakeTimers();

    const pending = waitForDefense();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await emitSystemSocket({
      action: 'matrixDefenseRolled',
      payload: { attackerUuid, defenderUuid, defenseHits: 4 },
    });

    await expect(pending).resolves.toBe(0);
  });

  it('falls back when the emit itself fails', async () => {
    globalThis.game.socket.emit = vi.fn(() => {
      throw new Error('socket down');
    });

    await expect(waitForDefense()).resolves.toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to emit triggerMatrixDefense'),
      expect.any(Error)
    );
  });

  it('detaches its handler so a later exchange is unaffected', async () => {
    respondWith({ attackerUuid, defenderUuid, defenseHits: 3 });

    await waitForDefense();
    const seen = vi.fn();
    onSystemSocket(seen);
    responders.push(seen);

    await emitSystemSocket({
      action: 'matrixDefenseRolled',
      payload: { attackerUuid, defenderUuid, defenseHits: 9 },
    });

    expect(seen).toHaveBeenCalledTimes(1);
  });
});
