import { describe, it, expect } from 'vitest';
import {
  determineBoni,
  computeFinalPool,
} from '../src/utils/dialog/dialogutility.js';

function makeParams(overrides = {}) {
  return {
    explode: false,
    maxEdge: 6,
    specialization: false,
    smartlink: false,
    bonus: 0,
    malus: 0,
    ...overrides,
  };
}

describe('determineBoni', () => {
  it.each([
    ['no bonuses active', {}, 0],
    ['specialization', { specialization: true }, 2],
    ['smartlink', { smartlink: true }, 2],
    ['explode', { explode: true, maxEdge: 4 }, 4],
  ])('returns %s', (_label, overrides, expected) => {
    expect(determineBoni(makeParams(overrides))).toBe(expected);
  });

  it('stacks all bonuses', () => {
    const params = makeParams({
      specialization: true,
      smartlink: true,
      explode: true,
      maxEdge: 5,
    });
    expect(determineBoni(params)).toBe(2 + 2 + 5);
  });
});

describe('computeFinalPool', () => {
  it('returns base dice with no modifiers', () => {
    expect(computeFinalPool(10, makeParams())).toBe(10);
  });

  it('adds bonus and subtracts malus', () => {
    expect(computeFinalPool(10, makeParams({ bonus: 3, malus: 1 }))).toBe(12);
  });

  it('subtracts recoil malus', () => {
    expect(computeFinalPool(10, makeParams(), 2)).toBe(8);
  });

  it('includes specialization + smartlink + edge boni', () => {
    const params = makeParams({
      specialization: true,
      smartlink: true,
      explode: true,
      maxEdge: 6,
    });
    // 10 + 0 - 0 - 0 + (2 + 2 + 6) = 20
    expect(computeFinalPool(10, params)).toBe(20);
  });

  it('handles combined bonus, malus, recoil and boni', () => {
    const params = makeParams({
      bonus: 2,
      malus: 1,
      specialization: true,
      explode: true,
      maxEdge: 4,
    });
    // 8 + 2 - 1 - 3 + (2 + 0 + 4) = 12
    expect(computeFinalPool(8, params, 3)).toBe(12);
  });
});
