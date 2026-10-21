import { describe, it, expect, vi, beforeEach } from 'vitest';

const settingsGetMock = vi.fn();

vi.mock('@utils/game', () => ({
  getGame: () => globalThis.game,
}));

import {
  getAvailableAffinities,
  clampForce,
  calculateSummoningDrain,
  SPIRIT_AFFINITY_CATEGORIES,
} from '../src/domains/summoned-entity/dialogs/summoning-helpers.js';

beforeEach(() => {
  vi.clearAllMocks();

  globalThis.game = {
    settings: {
      get: settingsGetMock,
    },
  };

  settingsGetMock.mockReturnValue(false);
});

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
  describe('default calculation', () => {
    beforeEach(() => {
      settingsGetMock.mockReturnValue(false);
    });

    it.each([
      [3, 6],
      [5, 10],
      [10, 20],
      [2, 4],
    ])('returns 2 × %i hits = %i', (hits, expected) => {
      expect(calculateSummoningDrain(6, hits)).toBe(expected);
    });

    it.each([0, 1])('has a minimum drain of 2 (hits=%i)', (hits) => {
      expect(calculateSummoningDrain(6, hits)).toBe(2);
    });

    it('adds a positive modifier term', () => {
      expect(calculateSummoningDrain(6, 3, 2)).toBe(8);
    });

    it('adds a negative modifier term', () => {
      expect(calculateSummoningDrain(6, 3, -2)).toBe(4);
    });
  });

  describe('alternative calculation using Force', () => {
    beforeEach(() => {
      settingsGetMock.mockReturnValue(true);
    });

    it.each([
      [1, 1],
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [6, 3],
      [10, 5, 0],
      [10, 6, 1],
    ])(
      'calculates ceil(Force / 2) for Force %i = %i',
      (force, expected, hits) => {
        expect(calculateSummoningDrain(force, hits || 0)).toBe(expected);
      }
    );

    it('adds a positive modifier to the alternative formula', () => {
      expect(calculateSummoningDrain(5, 3, 2)).toBe(8);
    });

    it('adds a negative modifier to the alternative formula', () => {
      expect(calculateSummoningDrain(5, 3, -1)).toBe(5);
    });

    it('uses the summoningDrain setting', () => {
      calculateSummoningDrain(5, 3, 2);

      expect(settingsGetMock).toHaveBeenCalledWith(
        'shadowrun4e',
        'summoningDrain'
      );
    });
  });
});
