import { describe, it, expect, afterEach, vi } from 'vitest';
import { createAwaitableDecision } from '../src/utils/rolls/awaitable-decision.js';

const ID = 'msg-1';

afterEach(() => {
  vi.useRealTimers();
});

describe('createAwaitableDecision', () => {
  it('resolves the parked promise with the value passed to settle', async () => {
    const decisions = createAwaitableDecision();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
    });

    expect(decisions.get(ID)).toBeDefined();
    decisions.settle(ID, 7);

    await expect(promise).resolves.toBe(7);
    expect(decisions.get(ID)).toBeUndefined();
  });

  it('falls back to getDefault when settle is called without a value', async () => {
    const decisions = createAwaitableDecision();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
    });

    decisions.settle(ID);

    await expect(promise).resolves.toBe(3);
  });

  it('auto-resolves with getDefault after the timeout elapses', async () => {
    vi.useFakeTimers();
    const decisions = createAwaitableDecision();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe(3);
    expect(decisions.get(ID)).toBeUndefined();
  });

  it('runs onTimeout as an additional hook after settling', async () => {
    vi.useFakeTimers();
    const decisions = createAwaitableDecision();
    const onTimeout = vi.fn();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
      onTimeout,
    });

    await vi.advanceTimersByTimeAsync(1000);

    expect(onTimeout).toHaveBeenCalledOnce();
    await expect(promise).resolves.toBe(3);
    expect(decisions.get(ID)).toBeUndefined();
  });

  it('settles on timeout even when onTimeout never settles itself', async () => {
    vi.useFakeTimers();
    const decisions = createAwaitableDecision();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
      onTimeout: () => {},
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe(3);
    expect(decisions.get(ID)).toBeUndefined();
  });

  it('settles a previous entry when the same id is parked twice', async () => {
    vi.useFakeTimers();
    const decisions = createAwaitableDecision();
    const first = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 1,
    });
    const second = decisions.park({
      messageId: ID,
      timeoutMs: 5000,
      getDefault: () => 2,
    });

    await expect(first).resolves.toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(decisions.get(ID)).toBeDefined();

    decisions.settle(ID, 8);
    await expect(second).resolves.toBe(8);
  });

  it('clears the timeout on settle so it cannot fire twice', async () => {
    vi.useFakeTimers();
    const decisions = createAwaitableDecision();
    const promise = decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 3,
    });

    decisions.settle(ID, 4);
    expect(decisions.settle(ID, 99)).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe(4);
  });

  it('exposes stored extra fields on the entry', () => {
    const decisions = createAwaitableDecision();
    decisions.park({
      messageId: ID,
      timeoutMs: 1000,
      getDefault: () => 0,
      extra: { rollResult: { successes: 2 } },
    });

    expect(decisions.get(ID).rollResult).toEqual({ successes: 2 });
    decisions.settle(ID);
  });
});
