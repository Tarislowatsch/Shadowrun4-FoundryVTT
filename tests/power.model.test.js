import { describe, it, expect } from 'vitest';
import {
  SR4PowerData,
  powerPointCost,
} from '../src/models/magic/power.models.js';

function makePower(overrides = {}) {
  return Object.assign(Object.create(SR4PowerData.prototype), {
    ratingMode: 'none',
    rating: 1,
    cost: 0.5,
    ...overrides,
  });
}

describe('SR4PowerData.totalCost', () => {
  it.each([
    ['none', 1, 0.5, 0.5],
    ['none', 3, 1, 1],
    ['rated', 1, 0.25, 0.25],
    ['rated', 3, 0.5, 1.5],
    ['rated', 4, 0.25, 1],
    ['ratedNoCost', 1, 0.5, 0.5],
    ['ratedNoCost', 5, 0.5, 0.5],
  ])(
    'ratingMode=%s rating=%d cost=%d → %d',
    (ratingMode, rating, cost, expected) => {
      const p = makePower({ ratingMode, rating, cost });
      expect(p.totalCost).toBe(expected);
    }
  );
});

describe('powerPointCost', () => {
  it('uses a precomputed totalCost when the sheet data carries one', () => {
    expect(powerPointCost({ totalCost: 1.5, cost: 0.5 })).toBe(1.5);
  });

  it('falls back to the rating formula for plain item data', () => {
    expect(powerPointCost({ ratingMode: 'rated', rating: 3, cost: 0.5 })).toBe(
      1.5
    );
    expect(powerPointCost({ ratingMode: 'none', rating: 3, cost: 0.5 })).toBe(
      0.5
    );
  });

  it('costs nothing while the power is suppressed', () => {
    expect(powerPointCost({ totalCost: 1.5, suppressed: true })).toBe(0);
  });

  it('treats missing data as free', () => {
    expect(powerPointCost(undefined)).toBe(0);
    expect(powerPointCost({})).toBe(0);
  });
});
