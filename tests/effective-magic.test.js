import { describe, it, expect } from 'vitest';
import { SR4Actor } from '@documents/actor.js';

/**
 * @param {{ magic?: number, tradition?: string, type?: string }} options
 * @returns {SR4Actor}
 */
function makeActor({ magic = 0, tradition = '', type = 'character' } = {}) {
  const actor = Object.create(SR4Actor.prototype);
  actor.system = {
    sheetStats: { MAGIC: magic },
    magic: { tradition },
  };
  actor.type = type;
  return actor;
}

/**
 * @param {object} flags
 * @returns {{ getFlag: () => object }}
 */
function makeScene(flags) {
  return { getFlag: () => flags };
}

describe('SR4Actor.getEffectiveMagic', () => {
  it('reduces effective Magic by a positive Background Count', () => {
    const actor = makeActor({ magic: 4 });
    expect(actor.getEffectiveMagic(makeScene({ backgroundCount: 3 }))).toBe(1);
  });

  it('reduces by the same magnitude for a negative Background Count', () => {
    const actor = makeActor({ magic: 4 });
    expect(actor.getEffectiveMagic(makeScene({ backgroundCount: -3 }))).toBe(1);
  });

  it('raises effective Magic above base for a matching aspected tradition', () => {
    const actor = makeActor({ magic: 4, tradition: 'HERMETIC' });
    const scene = makeScene({
      backgroundCount: 3,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(actor.getEffectiveMagic(scene)).toBe(7);
  });

  it('applies the malus for a mismatched aspected tradition', () => {
    const actor = makeActor({ magic: 4, tradition: 'SHAMANIC' });
    const scene = makeScene({
      backgroundCount: 3,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(actor.getEffectiveMagic(scene)).toBe(1);
  });

  it('clamps at 0 when the malus exceeds base Magic', () => {
    const actor = makeActor({ magic: 2 });
    expect(actor.getEffectiveMagic(makeScene({ backgroundCount: 5 }))).toBe(0);
  });

  it('treats a spirit (no tradition) as always unaspected', () => {
    const spirit = makeActor({ magic: 6, type: 'spirit' });
    const scene = makeScene({
      backgroundCount: 2,
      backgroundCountTradition: 'HERMETIC',
    });
    expect(spirit.getEffectiveMagic(scene)).toBe(4);
    expect(spirit.getEffectiveMagic(makeScene({ backgroundCount: -2 }))).toBe(
      4
    );
  });
});
