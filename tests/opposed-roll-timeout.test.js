import { describe, it, expect } from 'vitest';
import { getOpposedRollFallbackTimeoutMs } from '../src/utils/game/opposed-roll-timeout.js';
import { SR4 } from '../src/config.js';

describe('getOpposedRollFallbackTimeoutMs', () => {
  it('adds the workflow buffer to the configured timeout, in milliseconds', () => {
    expect(getOpposedRollFallbackTimeoutMs(30)).toBe(
      (30 + SR4.workflow.opposedRollFallbackBufferSeconds) * 1000
    );
  });

  it('covers the full setting range', () => {
    expect(getOpposedRollFallbackTimeoutMs(10)).toBe(20_000);
    expect(getOpposedRollFallbackTimeoutMs(120)).toBe(130_000);
  });

  it('always exceeds the plain timeout-in-ms value', () => {
    for (const timeoutSeconds of [10, 30, 60, 120]) {
      expect(getOpposedRollFallbackTimeoutMs(timeoutSeconds)).toBeGreaterThan(
        timeoutSeconds * 1000
      );
    }
  });
});
