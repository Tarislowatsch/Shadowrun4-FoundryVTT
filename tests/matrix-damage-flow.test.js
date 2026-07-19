import { describe, it, expect } from 'vitest';
import {
  applyMatrixDamage,
  computeBiofeedbackDamage,
  isJammedMatrixEscape,
} from '@utils/matrix/matrix-rules.js';

describe('isJammedMatrixEscape', () => {
  it('blocks leaving matrix while jammed', () => {
    expect(isJammedMatrixEscape('Actor.ic', { changedRealm: 'physical' })).toBe(
      true
    );
  });

  it('blocks sim mode switches while jammed', () => {
    expect(isJammedMatrixEscape('Actor.ic', { changedSimMode: 'cold' })).toBe(
      true
    );
  });

  it('allows the combined jack-out update that clears the jam', () => {
    expect(
      isJammedMatrixEscape('Actor.ic', {
        changedRealm: 'physical',
        clearingJam: true,
      })
    ).toBe(false);
  });

  it('allows staying in matrix', () => {
    expect(isJammedMatrixEscape('Actor.ic', { changedRealm: 'matrix' })).toBe(
      false
    );
  });

  it('does nothing when not jammed', () => {
    expect(isJammedMatrixEscape('', { changedRealm: 'physical' })).toBe(false);
  });

  it('ignores updates that touch neither realm nor sim mode', () => {
    expect(isJammedMatrixEscape('Actor.ic', {})).toBe(false);
  });
});

describe('applyMatrixDamage', () => {
  it('adds damage below the cap', () => {
    expect(applyMatrixDamage(2, 10, 3)).toEqual({ value: 5, crashed: false });
  });

  it('caps at max', () => {
    expect(applyMatrixDamage(8, 10, 20)).toEqual({ value: 10, crashed: true });
  });

  it('crashes at exactly max', () => {
    expect(applyMatrixDamage(6, 10, 4)).toEqual({ value: 10, crashed: true });
  });

  it('ignores negative amounts', () => {
    expect(applyMatrixDamage(3, 10, -5)).toEqual({ value: 3, crashed: false });
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
