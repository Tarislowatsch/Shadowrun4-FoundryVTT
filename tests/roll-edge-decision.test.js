import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ALWAYS_OFFER_EDGE,
  awaitEdgeDecision,
  resolveEdgeForRoll,
  resolveFinalSuccesses,
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

describe('resolveEdgeForRoll', () => {
  const roll = (overrides = {}) => ({
    successes: 3,
    rolledDice: 6,
    isGlitch: false,
    edgeUsed: false,
    messageId: ID,
    ...overrides,
  });

  it('parks a decision when the threshold can never be met', async () => {
    const promise = resolveEdgeForRoll(makeActor(2), roll(), ALWAYS_OFFER_EDGE);
    expect(getEdgeDecisionEntry(ID)).toBeDefined();

    await resolveEdgeDecision(ID, 5);
    await expect(promise).resolves.toBe(5);
  });

  it('returns immediately once the threshold is met', async () => {
    const result = await resolveEdgeForRoll(makeActor(2), roll(), 3);
    expect(result).toBe(3);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
  });

  it('returns immediately when Edge was already spent on the roll', async () => {
    const result = await resolveEdgeForRoll(
      makeActor(2),
      roll({ edgeUsed: true }),
      ALWAYS_OFFER_EDGE
    );
    expect(result).toBe(3);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
  });

  it('offers Edge on a glitch too, so the point can buy the glitch away', async () => {
    const promise = resolveEdgeForRoll(
      makeActor(2),
      roll({ isGlitch: true }),
      ALWAYS_OFFER_EDGE
    );
    expect(getEdgeDecisionEntry(ID)?.rollResult.isGlitch).toBe(true);

    await resolveEdgeDecision(ID, 0);
    await expect(promise).resolves.toBe(0);
  });

  it('falls back to the rolled successes when a glitched offer times out', async () => {
    vi.useFakeTimers();
    const promise = resolveEdgeForRoll(
      makeActor(2),
      roll({ isGlitch: true }),
      ALWAYS_OFFER_EDGE
    );

    await vi.advanceTimersByTimeAsync(20 * 1000);

    await expect(promise).resolves.toBe(3);
    expect(getEdgeDecisionEntry(ID)).toBeUndefined();
  });
});

describe('resolveFinalSuccesses', () => {
  it('aborts only when there is no roll result', async () => {
    await expect(resolveFinalSuccesses(makeActor(2), null)).resolves.toBeNull();
  });

  it('keeps the hits of a plain glitch instead of aborting the action', async () => {
    const result = await resolveFinalSuccesses(makeActor(0), {
      successes: 3,
      rolledDice: 6,
      isGlitch: true,
      edgeUsed: false,
      messageId: ID,
    });
    expect(result).toBe(3);
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
