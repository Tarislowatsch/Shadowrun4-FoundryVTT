import { describe, it, expect } from 'vitest';
import {
  getAvailableBindings,
  clampForce,
  calculateSummoningDrain,
  BINDING_CATEGORIES,
} from '../src/utils/dialog/magic/summoning-helpers.js';

describe('BINDING_CATEGORIES', () => {
  it('contains exactly the 5 spell categories', () => {
    expect(BINDING_CATEGORIES).toEqual([
      'COMBAT',
      'DETECTION',
      'HEALTH',
      'ILLUSION',
      'MANIPULATION',
    ]);
  });
});

describe('getAvailableBindings', () => {
  it('returns empty array when all bindings are empty', () => {
    const bindings = {
      COMBAT: '',
      DETECTION: '',
      HEALTH: '',
      ILLUSION: '',
      MANIPULATION: '',
    };
    expect(getAvailableBindings(bindings)).toEqual([]);
  });

  it('returns filled bindings only', () => {
    const bindings = {
      COMBAT: 'Fire Spirit',
      DETECTION: '',
      HEALTH: 'Water Spirit',
      ILLUSION: '',
      MANIPULATION: '',
    };
    expect(getAvailableBindings(bindings)).toEqual([
      'Fire Spirit',
      'Water Spirit',
    ]);
  });

  it('deduplicates identical spirit types', () => {
    const bindings = {
      COMBAT: 'Fire Spirit',
      DETECTION: 'Fire Spirit',
      HEALTH: 'Water Spirit',
      ILLUSION: 'Fire Spirit',
      MANIPULATION: 'Water Spirit',
    };
    expect(getAvailableBindings(bindings)).toEqual([
      'Fire Spirit',
      'Water Spirit',
    ]);
  });

  it('trims whitespace-only entries', () => {
    const bindings = {
      COMBAT: '  ',
      DETECTION: 'Air Spirit',
      HEALTH: '',
      ILLUSION: '  ',
      MANIPULATION: 'Earth Spirit',
    };
    expect(getAvailableBindings(bindings)).toEqual([
      'Air Spirit',
      'Earth Spirit',
    ]);
  });

  it('handles null/undefined bindings gracefully', () => {
    expect(getAvailableBindings(null)).toEqual([]);
    expect(getAvailableBindings(undefined)).toEqual([]);
  });

  it('returns all 5 when fully configured', () => {
    const bindings = {
      COMBAT: 'Fire',
      DETECTION: 'Air',
      HEALTH: 'Water',
      ILLUSION: 'Man',
      MANIPULATION: 'Earth',
    };
    expect(getAvailableBindings(bindings)).toEqual([
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
  it('returns 2 × spirit hits', () => {
    expect(calculateSummoningDrain(3)).toBe(6);
    expect(calculateSummoningDrain(5)).toBe(10);
    expect(calculateSummoningDrain(10)).toBe(20);
  });

  it('has a minimum drain of 2', () => {
    expect(calculateSummoningDrain(0)).toBe(2);
    expect(calculateSummoningDrain(1)).toBe(2);
  });

  it('returns 4 for 2 hits', () => {
    expect(calculateSummoningDrain(2)).toBe(4);
  });
});
