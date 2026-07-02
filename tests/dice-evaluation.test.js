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
  it.each([
    ['failures >= half the dice', 3, [1, 1, 1, 5, 6, 4], false, true],
    ['failures exactly half', 2, [1, 1, 5, 6], false, true],
    ['failures < half', 1, [1, 5, 6, 4], false, false],
    ['reroll ignores failures', 3, [1, 1, 1, 5, 6, 4], true, false],
    ['single die, 1 failure', 1, [1], false, true],
    ['single die, 0 failures', 0, [5], false, false],
  ])('%s', (_label, failures, rolls, reroll, expected) => {
    expect(isGlitch({ failures, rolls }, reroll)).toBe(expected);
  });
});

describe('isCriticalGlitch', () => {
  it.each([
    ['glitch and 0 successes', 0, 3, [1, 1, 1, 2, 3, 4], false, true],
    ['glitch but has successes', 1, 3, [1, 1, 1, 5, 3, 4], false, false],
    ['no glitch and 0 successes', 0, 0, [2, 3, 4], false, false],
    ['reroll', 0, 3, [1, 1, 1, 2, 3, 4], true, false],
  ])('%s', (_label, successes, failures, rolls, reroll, expected) => {
    expect(isCriticalGlitch({ successes, failures, rolls }, reroll)).toBe(
      expected
    );
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
