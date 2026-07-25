import { describe, it, expect } from 'vitest';
import {
  getSceneModifiers,
  getBackgroundCount,
  getBackgroundCountMagicModifier,
  getEffectiveDrainModifier,
  getMysticAdeptReduction,
} from '@utils/scene/scene-modifiers.js';

/**
 * @param {object} flags
 * @returns {{ getFlag: (scope: string, key: string) => object }}
 */
function makeScene(flags) {
  return { getFlag: () => flags };
}

describe('getSceneModifiers', () => {
  it('merges stored flags with defaults', () => {
    expect(getSceneModifiers(makeScene({ backgroundCount: 3 }))).toEqual({
      backgroundCount: 3,
      backgroundCountTradition: '',
      mysticAdeptReduction: 'spellpower',
    });
  });

  it('returns defaults for a scene without flags', () => {
    expect(getSceneModifiers(undefined)).toEqual({
      backgroundCount: 0,
      backgroundCountTradition: '',
      mysticAdeptReduction: 'spellpower',
    });
  });
});

describe('getMysticAdeptReduction', () => {
  it('defaults to the spellpower share', () => {
    expect(getMysticAdeptReduction(makeScene({}))).toBe('spellpower');
  });

  it('reads the stored gamemaster choice', () => {
    expect(
      getMysticAdeptReduction(
        makeScene({ mysticAdeptReduction: 'powerPoints' })
      )
    ).toBe('powerPoints');
  });

  it('falls back to spellpower for an unknown value', () => {
    expect(
      getMysticAdeptReduction(makeScene({ mysticAdeptReduction: 'nonsense' }))
    ).toBe('spellpower');
  });
});

describe('getBackgroundCount', () => {
  it('reads the stored value', () => {
    expect(getBackgroundCount(makeScene({ backgroundCount: -2 }))).toBe(-2);
  });

  it('defaults to 0', () => {
    expect(getBackgroundCount(makeScene({}))).toBe(0);
  });
});

describe('getBackgroundCountMagicModifier', () => {
  it('returns 0 for a zero count', () => {
    expect(
      getBackgroundCountMagicModifier(makeScene({ backgroundCount: 0 }))
    ).toBe(0);
  });

  it('returns the magnitude as a malus for a positive count', () => {
    expect(
      getBackgroundCountMagicModifier(makeScene({ backgroundCount: 3 }))
    ).toBe(3);
  });

  it('returns the same magnitude malus for a negative count', () => {
    expect(
      getBackgroundCountMagicModifier(makeScene({ backgroundCount: -3 }))
    ).toBe(3);
  });

  it('returns a bonus when the count is aspected to the actor tradition', () => {
    const scene = makeScene({
      backgroundCount: 4,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(getBackgroundCountMagicModifier(scene, 'HERMETIC')).toBe(-4);
  });

  it('returns a malus for a non-matching aspected tradition', () => {
    const scene = makeScene({
      backgroundCount: 4,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(getBackgroundCountMagicModifier(scene, 'SHAMANIC')).toBe(4);
  });

  it('returns a malus for an unaspected count even when the actor has a tradition', () => {
    const scene = makeScene({
      backgroundCount: 2,
      backgroundCountTradition: '',
    });
    expect(getBackgroundCountMagicModifier(scene, 'HERMETIC')).toBe(2);
  });

  it('treats a tradition-less actor as unaspected', () => {
    const scene = makeScene({
      backgroundCount: 2,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(getBackgroundCountMagicModifier(scene, '')).toBe(2);
  });
});

describe('getEffectiveDrainModifier', () => {
  it('derives the modifier from the actor tradition', () => {
    const scene = makeScene({
      backgroundCount: 3,
      backgroundCountTradition: 'HERMETIC',
    });
    const actor = { getMagicTradition: () => 'HERMETIC' };
    expect(getEffectiveDrainModifier(actor, scene)).toBe(-3);
  });
});
