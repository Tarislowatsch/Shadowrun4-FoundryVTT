import { describe, it, expect } from 'vitest';
import {
  evaluateDie,
  isGlitch,
  isCriticalGlitch,
  buildRollFormula,
} from '../src/utils/rolls/diceutility.js';

describe('evaluateDie', () => {
  it.each([
    [1, false, true],
    [2, false, false],
    [3, false, false],
    [4, false, false],
    [5, true, false],
    [6, true, false],
  ])('die value %i → success=%s failure=%s', (value, success, failure) => {
    const result = evaluateDie(value);
    expect(result.isSuccess).toBe(success);
    expect(result.isFailure).toBe(failure);
  });
});

describe('isGlitch', () => {
  it('returns true when failures >= half the dice', () => {
    expect(isGlitch({ failures: 3, rolls: [1, 1, 1, 5, 6, 4] })).toBe(true);
  });

  it('returns true when failures are exactly half', () => {
    expect(isGlitch({ failures: 2, rolls: [1, 1, 5, 6] })).toBe(true);
  });

  it('returns false when failures < half', () => {
    expect(isGlitch({ failures: 1, rolls: [1, 5, 6, 4] })).toBe(false);
  });

  it('returns false on reroll regardless of failures', () => {
    expect(isGlitch({ failures: 3, rolls: [1, 1, 1, 5, 6, 4] }, true)).toBe(
      false
    );
  });

  it('handles single die — 1 failure on 1 die is a glitch', () => {
    expect(isGlitch({ failures: 1, rolls: [1] })).toBe(true);
  });

  it('handles single die — 0 failures on 1 die is not a glitch', () => {
    expect(isGlitch({ failures: 0, rolls: [5] })).toBe(false);
  });
});

describe('isCriticalGlitch', () => {
  it('returns true when glitch and 0 successes', () => {
    expect(
      isCriticalGlitch({ successes: 0, failures: 3, rolls: [1, 1, 1, 2, 3, 4] })
    ).toBe(true);
  });

  it('returns false when glitch but has successes', () => {
    expect(
      isCriticalGlitch({ successes: 1, failures: 3, rolls: [1, 1, 1, 5, 3, 4] })
    ).toBe(false);
  });

  it('returns false when no glitch and 0 successes', () => {
    expect(
      isCriticalGlitch({ successes: 0, failures: 0, rolls: [2, 3, 4] })
    ).toBe(false);
  });

  it('returns false on reroll', () => {
    expect(
      isCriticalGlitch(
        { successes: 0, failures: 3, rolls: [1, 1, 1, 2, 3, 4] },
        true
      )
    ).toBe(false);
  });
});

describe('buildRollFormula', () => {
  it('builds a standard pool formula', () => {
    expect(buildRollFormula({ numDice: 8 })).toBe('8d6cs>=5');
  });

  it('adds exploding dice modifier', () => {
    expect(buildRollFormula({ numDice: 6, explode: true })).toBe('6d6xcs>=5');
  });

  it('omits explode when false', () => {
    expect(buildRollFormula({ numDice: 3, explode: false })).toBe('3d6cs>=5');
  });
});
