import { describe, it, expect } from 'vitest';
import { computeKnockdown } from '@models/shared/knockdown-rules.js';

const BASE = { mode: 'always', autoThreshold: 10, bodyModifier: 0 };

describe('computeKnockdown', () => {
  it.each([
    ['damage equals Body', { damage: 3, body: 3 }, true, 3, 'body'],
    ['damage exceeds Body', { damage: 6, body: 3 }, true, 3, 'body'],
    ['damage below Body', { damage: 4, body: 5 }, false, 5, null],
    ['just below the auto threshold', { damage: 9, body: 12 }, false, 12, null],
  ])('%s', (_label, params, knocked, threshold, reason) => {
    expect(computeKnockdown({ ...BASE, ...params })).toEqual({
      knocked,
      threshold,
      reason,
    });
  });

  it('reports the auto threshold as the reason, not the untouched Body', () => {
    expect(computeKnockdown({ ...BASE, damage: 10, body: 12 })).toEqual({
      knocked: true,
      threshold: 10,
      reason: 'auto',
    });
  });

  it('autoThreshold 0 disables the always-knockdown part', () => {
    expect(
      computeKnockdown({ ...BASE, autoThreshold: 0, damage: 20, body: 25 })
    ).toEqual({ knocked: false, threshold: 25, reason: null });
  });

  it('gel rounds lower the threshold by 2', () => {
    expect(
      computeKnockdown({ ...BASE, damage: 3, body: 5, gelRounds: true })
    ).toEqual({ knocked: true, threshold: 3, reason: 'body' });
  });

  it('bodyModifier shifts the threshold', () => {
    expect(computeKnockdown({ ...BASE, damage: 4, body: 3 })).toEqual({
      knocked: true,
      threshold: 3,
      reason: 'body',
    });
    expect(
      computeKnockdown({ ...BASE, bodyModifier: 2, damage: 4, body: 3 })
    ).toEqual({ knocked: false, threshold: 5, reason: null });
  });

  it('never drops the threshold below 1', () => {
    expect(
      computeKnockdown({
        ...BASE,
        bodyModifier: -5,
        damage: 0,
        body: 1,
        gelRounds: true,
      })
    ).toEqual({ knocked: false, threshold: 1, reason: null });
  });

  it('mode off never knocks down', () => {
    expect(
      computeKnockdown({ ...BASE, mode: 'off', damage: 20, body: 1 })
    ).toEqual({ knocked: false, threshold: 0, reason: null });
  });

  it('mode gelOnly skips the Body check for attacks without gel rounds', () => {
    expect(
      computeKnockdown({ ...BASE, mode: 'gelOnly', damage: 9, body: 1 })
    ).toEqual({ knocked: false, threshold: 0, reason: null });
  });

  it.each([undefined, null, '', 'bogus'])(
    'treats the unusable mode %p as off',
    (mode) => {
      expect(computeKnockdown({ ...BASE, mode, damage: 20, body: 3 })).toEqual({
        knocked: false,
        threshold: 0,
        reason: null,
      });
    }
  );

  it('gelOnly still applies the auto threshold to every attack', () => {
    expect(
      computeKnockdown({ ...BASE, mode: 'gelOnly', damage: 20, body: 3 })
    ).toEqual({ knocked: true, threshold: 10, reason: 'auto' });
    expect(
      computeKnockdown({
        ...BASE,
        mode: 'gelOnly',
        damage: 20,
        body: 30,
        gelRounds: true,
      })
    ).toEqual({ knocked: true, threshold: 10, reason: 'auto' });
  });

  it('mode gelOnly still applies to gel rounds', () => {
    expect(
      computeKnockdown({
        ...BASE,
        mode: 'gelOnly',
        damage: 3,
        body: 5,
        gelRounds: true,
      })
    ).toEqual({ knocked: true, threshold: 3, reason: 'body' });
  });
});
