import { describe, it, expect } from 'vitest';
import { SR4PowerData } from '../src/models/magic/power.models.js';

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
