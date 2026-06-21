import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  awaitEdgeDecision,
  resolveEdgeDecision,
  getEdgeDecisionEntry,
} from '../src/utils/rolls/roll-edge-decision.js';

// setup.js installs a foundry.Game stub and a matching `game` instance. Here we
// additionally stub game.messages / game.settings, which this module needs.

/** Applies Foundry-style flattened (dot-notation) update data to a plain object. */
function applyUpdate(target, data) {
  for (const [path, value] of Object.entries(data)) {
    const keys = path.split('.');
    let obj = target;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] ??= {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
  }
}

function makeMessage({ isAuthor = true } = {}) {
  const message = { isAuthor, flags: {} };
  message.update = vi.fn(async (data) => applyUpdate(message, data));
  return message;
}

function makeActor(currentEdge) {
  return {
    getAttribute: (key) => (key === 'CURRENTEDGE' ? currentEdge : 0),
  };
}

const ID = 'msg-1';
const rollResult = { successes: 3, rolledDice: 6, isGlitch: false };

let message;

beforeEach(() => {
  message = makeMessage();
  globalThis.game.messages = { get: (id) => (id === ID ? message : undefined) };
  globalThis.game.settings = { get: () => 20 };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('awaitEdgeDecision — immediate resolution (no offer)', () => {
  it('resolves with original successes when the actor has no Edge', async () => {
    const result = await awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(0),
      rollResult,
    });
    expect(result).toBe(3);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
    expect(message.update).not.toHaveBeenCalled();
  });

  it('resolves immediately when messageId is null', async () => {
    const result = await awaitEdgeDecision({
      messageId: null,
      actor: makeActor(2),
      rollResult,
    });
    expect(result).toBe(3);
  });

  it('resolves immediately when the message cannot be found', async () => {
    const result = await awaitEdgeDecision({
      messageId: 'does-not-exist',
      actor: makeActor(2),
      rollResult,
    });
    expect(result).toBe(3);
  });
});

describe('awaitEdgeDecision — pending offer', () => {
  it('registers an entry and flags the message as pending', async () => {
    const promise = awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(2),
      rollResult,
    });
    expect(getEdgeDecisionEntry(ID)).toBeDefined();

    await resolveEdgeDecision(ID, 5);
    await promise;

    expect(message.flags.sr4.edgeDecision.resolved).toBe(true);
  });

  it('resolves with the original successes after the timeout elapses', async () => {
    vi.useFakeTimers();
    const promise = awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(2),
      rollResult,
    });

    await vi.advanceTimersByTimeAsync(20 * 1000);

    await expect(promise).resolves.toBe(3);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
  });
});

describe('resolveEdgeDecision', () => {
  it('resolves the pending promise with the provided success count', async () => {
    const promise = awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(2),
      rollResult,
    });

    await resolveEdgeDecision(ID, 7);

    await expect(promise).resolves.toBe(7);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
    expect(message.flags.sr4.edgeDecision.resolved).toBe(true);
  });

  it('falls back to the original successes when no count is given', async () => {
    const promise = awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(2),
      rollResult,
    });

    await resolveEdgeDecision(ID);

    await expect(promise).resolves.toBe(3);
  });

  it('is a no-op on a second call (promise resolves once)', async () => {
    const promise = awaitEdgeDecision({
      messageId: ID,
      actor: makeActor(2),
      rollResult,
    });

    await resolveEdgeDecision(ID, 4);
    message.update.mockClear();
    await resolveEdgeDecision(ID, 99);

    await expect(promise).resolves.toBe(4);
    // Already resolved → no further document update.
    expect(message.update).not.toHaveBeenCalled();
  });
});
