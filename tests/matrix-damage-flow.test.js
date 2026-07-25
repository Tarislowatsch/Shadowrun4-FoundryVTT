import { describe, it, expect } from 'vitest';
import {
  applyMatrixDamage,
  computeBiofeedbackDamage,
  isJammedMatrixEscape,
} from '@domains/matrix/matrix-rules.js';

describe('isJammedMatrixEscape', () => {
  it.each([
    [
      'blocks leaving matrix while jammed',
      'Actor.ic',
      { changedRealm: 'physical' },
      true,
    ],
    [
      'blocks sim mode switches while jammed',
      'Actor.ic',
      { changedSimMode: 'cold' },
      true,
    ],
    [
      'allows the combined jack-out update that clears the jam',
      'Actor.ic',
      { changedRealm: 'physical', clearingJam: true },
      false,
    ],
    ['allows staying in matrix', 'Actor.ic', { changedRealm: 'matrix' }, false],
    ['does nothing when not jammed', '', { changedRealm: 'physical' }, false],
    [
      'ignores updates that touch neither realm nor sim mode',
      'Actor.ic',
      {},
      false,
    ],
  ])('%s', (label, jammedById, update, expected) => {
    expect(isJammedMatrixEscape(jammedById, update)).toBe(expected);
  });
});

describe('applyMatrixDamage', () => {
  it.each([
    ['adds damage below the cap', 2, 10, 3, 5, false],
    ['caps at max', 8, 10, 20, 10, true],
    ['crashes at exactly max', 6, 10, 4, 10, true],
    ['ignores negative amounts', 3, 10, -5, 3, false],
  ])('%s', (label, value, max, amount, expectedValue, expectedCrashed) => {
    expect(applyMatrixDamage(value, max, amount)).toEqual({
      value: expectedValue,
      crashed: expectedCrashed,
    });
  });
});

describe('computeBiofeedbackDamage', () => {
  const state = (over = {}) => ({
    simMode: 'cold',
    inVR: true,
    stunValue: 0,
    stunMax: 10,
    ...over,
  });

  it('blackout deals stun and never overflows', () => {
    const result = computeBiofeedbackDamage(
      'blackout',
      8,
      0,
      state({ stunValue: 7, stunMax: 10 })
    );
    expect(result).toEqual({ amount: 3, isPhysical: false });
  });

  it('blackout subtracts resist hits before clamping', () => {
    const result = computeBiofeedbackDamage('blackout', 8, 3, state());
    expect(result).toEqual({ amount: 5, isPhysical: false });
  });

  it('black hammer is physical vs hot-sim VR users', () => {
    const result = computeBiofeedbackDamage(
      'blackHammer',
      6,
      1,
      state({ simMode: 'hot', inVR: true })
    );
    expect(result).toEqual({ amount: 5, isPhysical: true });
  });

  it('black hammer is stun vs cold-sim users', () => {
    const result = computeBiofeedbackDamage(
      'blackHammer',
      6,
      0,
      state({ simMode: 'cold' })
    );
    expect(result).toEqual({ amount: 6, isPhysical: false });
  });

  it('has no effect on AR (not in VR) users, regardless of program', () => {
    expect(
      computeBiofeedbackDamage('blackHammer', 6, 0, state({ inVR: false }))
    ).toEqual({ amount: 0, isPhysical: false });
    expect(
      computeBiofeedbackDamage('blackout', 8, 0, state({ inVR: false }))
    ).toEqual({ amount: 0, isPhysical: false });
  });
});
