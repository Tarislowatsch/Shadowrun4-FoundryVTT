import { describe, it, expect } from 'vitest';
import { applyMetatypeLimits } from '../src/models/actor/metatype-limits.js';

/**
 * @param {{ stats?: Record<string, number>, effects?: Record<string, number>, modifiers?: object }} [options]
 * @returns {object}
 */
function makeSelf({ stats = {}, effects = {}, modifiers = {} } = {}) {
  const prepared = { ...stats };
  for (const [key, delta] of Object.entries(effects)) {
    prepared[key] = (prepared[key] ?? 0) + delta;
  }
  return {
    _source: { sheetStats: { ...stats } },
    sheetStats: prepared,
    modifiers,
    derivedStats: {},
  };
}

describe('applyMetatypeLimits', () => {
  it('publishes metatype limits and clamps base and effect bonuses without a maximum bonus', () => {
    const self = makeSelf({
      stats: { BODY: 8, AGILITY: 4 },
      effects: { AGILITY: 5 },
    });
    applyMetatypeLimits(self, {
      body: { min: 1, max: 6, aug: 9 },
      agility: { min: 1, max: 5, aug: 7 },
    });
    expect(self.derivedStats.attributeMinimum).toEqual({ BODY: 1, AGILITY: 1 });
    expect(self.derivedStats.attributeMaximum).toEqual({ BODY: 6, AGILITY: 5 });
    expect(self.derivedStats.augmentedMaximum).toEqual({ BODY: 9, AGILITY: 7 });
    expect(self.sheetStats.BODY).toBe(6);
    expect(self.sheetStats.AGILITY).toBe(7);
  });

  it('raises max and aug by an attributeMaximum bonus without touching other attributes', () => {
    const self = makeSelf({
      stats: { BODY: 5, AGILITY: 4 },
      modifiers: { attributeMaximum: { BODY: 1 } },
    });
    applyMetatypeLimits(self, {
      body: { min: 1, max: 6, aug: 9 },
      agility: { min: 1, max: 6, aug: 9 },
    });
    expect(self.derivedStats.attributeMaximum.BODY).toBe(7);
    expect(self.derivedStats.augmentedMaximum.BODY).toBe(10);
    expect(self.derivedStats.attributeMaximum.AGILITY).toBe(6);
    expect(self.derivedStats.augmentedMaximum.AGILITY).toBe(9);
  });

  it('recomputes aug via the 1.5 rule and shifts custom aug values in parallel', () => {
    const self = makeSelf({
      stats: { BODY: 4, ESSENCE: 6 },
      modifiers: { attributeMaximum: { BODY: 1, ESSENCE: 1 } },
    });
    applyMetatypeLimits(self, {
      body: { min: 1, max: 5, aug: 7 },
      essence: { min: 0, max: 6, aug: 6 },
    });
    expect(self.derivedStats.attributeMaximum.BODY).toBe(6);
    expect(self.derivedStats.augmentedMaximum.BODY).toBe(9);
    expect(self.derivedStats.attributeMaximum.ESSENCE).toBe(7);
    expect(self.derivedStats.augmentedMaximum.ESSENCE).toBe(7);
  });

  it('clamps against the raised limits', () => {
    const self = makeSelf({
      stats: { BODY: 7, AGILITY: 7 },
      effects: { AGILITY: 4 },
      modifiers: { attributeMaximum: { BODY: 1, AGILITY: 1 } },
    });
    applyMetatypeLimits(self, {
      body: { min: 1, max: 6, aug: 9 },
      agility: { min: 1, max: 6, aug: 9 },
    });
    expect(self.sheetStats.BODY).toBe(7);
    expect(self.sheetStats.AGILITY).toBe(10);
  });

  it('behaves unchanged when self.modifiers is undefined', () => {
    const self = makeSelf({ stats: { BODY: 8 } });
    self.modifiers = undefined;
    applyMetatypeLimits(self, { body: { min: 1, max: 6, aug: 9 } });
    expect(self.derivedStats.attributeMaximum.BODY).toBe(6);
    expect(self.derivedStats.augmentedMaximum.BODY).toBe(9);
    expect(self.sheetStats.BODY).toBe(6);
  });

  it('lowers max and aug symmetrically for a negative bonus', () => {
    const self = makeSelf({
      stats: { BODY: 6 },
      modifiers: { attributeMaximum: { BODY: -1 } },
    });
    applyMetatypeLimits(self, { body: { min: 1, max: 6, aug: 9 } });
    expect(self.derivedStats.attributeMaximum.BODY).toBe(5);
    expect(self.derivedStats.augmentedMaximum.BODY).toBe(7);
    expect(self.sheetStats.BODY).toBe(5);
  });

  it('applies stacked bonuses additively', () => {
    const self = makeSelf({
      stats: { BODY: 5 },
      modifiers: { attributeMaximum: { BODY: 2 } },
    });
    applyMetatypeLimits(self, { body: { min: 1, max: 6, aug: 9 } });
    expect(self.derivedStats.attributeMaximum.BODY).toBe(8);
    expect(self.derivedStats.augmentedMaximum.BODY).toBe(12);
  });
});
