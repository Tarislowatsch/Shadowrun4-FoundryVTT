import { describe, it, expect } from 'vitest';
import {
  getAvailableAffinities,
  clampForce,
  calculateSummoningDrain,
  SPIRIT_AFFINITY_CATEGORIES,
} from '../src/utils/dialog/magic/summoning-helpers.js';

describe('SPIRIT_AFFINITY_CATEGORIES', () => {
  it('contains exactly the 5 spell categories', () => {
    expect(SPIRIT_AFFINITY_CATEGORIES).toEqual([
      'COMBAT',
      'DETECTION',
      'HEALTH',
      'ILLUSION',
      'MANIPULATION',
    ]);
  });
});

describe('getAvailableAffinities', () => {
  it('returns empty array when all affinities are empty', () => {
    const affinities = {
      COMBAT: '',
      DETECTION: '',
      HEALTH: '',
      ILLUSION: '',
      MANIPULATION: '',
    };
    expect(getAvailableAffinities(affinities)).toEqual([]);
  });

  it('returns filled affinities only', () => {
    const affinities = {
      COMBAT: 'Fire Spirit',
      DETECTION: '',
      HEALTH: 'Water Spirit',
      ILLUSION: '',
      MANIPULATION: '',
    };
    expect(getAvailableAffinities(affinities)).toEqual([
      'Fire Spirit',
      'Water Spirit',
    ]);
  });

  it('deduplicates identical spirit types', () => {
    const affinities = {
      COMBAT: 'Fire Spirit',
      DETECTION: 'Fire Spirit',
      HEALTH: 'Water Spirit',
      ILLUSION: 'Fire Spirit',
      MANIPULATION: 'Water Spirit',
    };
    expect(getAvailableAffinities(affinities)).toEqual([
      'Fire Spirit',
      'Water Spirit',
    ]);
  });

  it('trims whitespace-only entries', () => {
    const affinities = {
      COMBAT: '  ',
      DETECTION: 'Air Spirit',
      HEALTH: '',
      ILLUSION: '  ',
      MANIPULATION: 'Earth Spirit',
    };
    expect(getAvailableAffinities(affinities)).toEqual([
      'Air Spirit',
      'Earth Spirit',
    ]);
  });

  it('handles null/undefined affinities gracefully', () => {
    expect(getAvailableAffinities(null)).toEqual([]);
    expect(getAvailableAffinities(undefined)).toEqual([]);
  });

  it('returns all 5 when fully configured', () => {
    const affinities = {
      COMBAT: 'Fire',
      DETECTION: 'Air',
      HEALTH: 'Water',
      ILLUSION: 'Man',
      MANIPULATION: 'Earth',
    };
    expect(getAvailableAffinities(affinities)).toEqual([
      'Fire',
      'Air',
      'Water',
      'Man',
      'Earth',
    ]);
  });
});

describe('clampForce', () => {
  it('clamps below minimum to 1', () => {
    expect(clampForce(0, 12)).toBe(1);
    expect(clampForce(-5, 12)).toBe(1);
  });

  it('clamps above maximum', () => {
    expect(clampForce(15, 12)).toBe(12);
    expect(clampForce(100, 12)).toBe(12);
  });

  it('leaves valid values unchanged', () => {
    expect(clampForce(6, 12)).toBe(6);
    expect(clampForce(1, 12)).toBe(1);
    expect(clampForce(12, 12)).toBe(12);
  });
});

describe('calculateSummoningDrain', () => {
  it.each([
    [3, 6],
    [5, 10],
    [10, 20],
    [2, 4],
  ])('returns 2 × %i hits = %i', (hits, expected) => {
    expect(calculateSummoningDrain(hits)).toBe(expected);
  });

  it.each([0, 1])('has a minimum drain of 2 (hits=%i)', (hits) => {
    expect(calculateSummoningDrain(hits)).toBe(2);
  });
});
