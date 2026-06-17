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
  it('returns 0 with no bonuses active', () => {
    expect(determineBoni(makeParams(), false)).toBe(0);
  });

  it('adds +2 for specialization', () => {
    expect(determineBoni(makeParams({ specialization: true }), false)).toBe(2);
  });

  it('adds +2 for smartlink on params', () => {
    expect(determineBoni(makeParams({ smartlink: true }), false)).toBe(2);
  });

  it('adds +2 for smartlink override argument', () => {
    expect(determineBoni(makeParams(), true)).toBe(2);
  });

  it('does not double-count smartlink from both sources', () => {
    expect(determineBoni(makeParams({ smartlink: true }), true)).toBe(2);
  });

  it('adds edge dice when explode is true', () => {
    expect(
      determineBoni(makeParams({ explode: true, maxEdge: 4 }), false)
    ).toBe(4);
  });

  it('stacks all bonuses', () => {
    const params = makeParams({
      specialization: true,
      smartlink: true,
      explode: true,
      maxEdge: 5,
    });
    expect(determineBoni(params, false)).toBe(2 + 2 + 5);
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
