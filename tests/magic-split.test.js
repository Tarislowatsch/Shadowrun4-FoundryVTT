import { describe, it, expect } from 'vitest';
import {
  resolveMagicSplit,
  computeMagicSplit,
  applyMagicModifier,
} from '../src/domains/magic/split.js';
import { SR4Actor } from '@documents/actor.js';
import { getAvailableRealms } from '@domains/combat/initiative.js';

function makeSystem({
  MAGIC = 6,
  magician = false,
  adept = false,
  spellpower = 0,
  powerPoints = 0,
} = {}) {
  return {
    sheetStats: { MAGIC },
    magic: { magician, adept, spellpower, powerPoints },
  };
}

describe('resolveMagicSplit', () => {
  it('gives a pure magician the full Magic attribute as spellpower', () => {
    expect(resolveMagicSplit({ magician: true }, 5)).toEqual({
      spellpower: 5,
      powerPoints: 0,
      overAllocated: false,
    });
  });

  it('gives a pure adept the full Magic attribute as power points', () => {
    expect(resolveMagicSplit({ adept: true }, 5)).toEqual({
      spellpower: 0,
      powerPoints: 5,
      overAllocated: false,
    });
  });

  it('leaves mundanes at zero', () => {
    expect(resolveMagicSplit({}, 5)).toEqual({
      spellpower: 0,
      powerPoints: 0,
      overAllocated: false,
    });
  });

  it('keeps a valid mystic adept allocation unchanged', () => {
    expect(
      resolveMagicSplit(
        { magician: true, adept: true, spellpower: 4, powerPoints: 2 },
        6
      )
    ).toEqual({ spellpower: 4, powerPoints: 2, overAllocated: false });
  });

  it('clamps the total, not just the single values', () => {
    expect(
      resolveMagicSplit(
        { magician: true, adept: true, spellpower: 6, powerPoints: 6 },
        6
      )
    ).toEqual({ spellpower: 6, powerPoints: 0, overAllocated: true });
  });

  it('clamps negative and non-numeric stored values to 0', () => {
    expect(
      resolveMagicSplit(
        { magician: true, adept: true, spellpower: -2, powerPoints: NaN },
        6
      )
    ).toEqual({ spellpower: 0, powerPoints: 0, overAllocated: true });
  });

  it('trims the adept share first when Magic drops', () => {
    expect(
      resolveMagicSplit(
        { magician: true, adept: true, spellpower: 2, powerPoints: 4 },
        4
      )
    ).toEqual({ spellpower: 2, powerPoints: 2, overAllocated: true });
  });
});

describe('computeMagicSplit', () => {
  it('derives from sheetStats.MAGIC and reports over-allocation', () => {
    expect(
      computeMagicSplit(
        makeSystem({
          magician: true,
          adept: true,
          spellpower: 5,
          powerPoints: 5,
        })
      )
    ).toEqual({ spellpower: 5, powerPoints: 1, magicOverAllocated: true });
  });

  it('ignores stored values for a pure magician', () => {
    expect(
      computeMagicSplit(makeSystem({ magician: true, powerPoints: 3 }))
    ).toEqual({ spellpower: 6, powerPoints: 0, magicOverAllocated: false });
  });
});

describe('applyMagicModifier', () => {
  it('reduces a pure magician like the plain Magic attribute', () => {
    expect(applyMagicModifier({ spellpower: 6, powerPoints: 0 }, 2)).toEqual({
      spellpower: 4,
      powerPoints: 0,
    });
  });

  it('costs a pure adept one power point per reduced Magic point', () => {
    expect(applyMagicModifier({ spellpower: 0, powerPoints: 6 }, 2)).toEqual({
      spellpower: 0,
      powerPoints: 4,
    });
  });

  it('takes the reduction off the spellpower share first', () => {
    expect(
      applyMagicModifier({ spellpower: 4, powerPoints: 2 }, 2, 'spellpower')
    ).toEqual({ spellpower: 2, powerPoints: 2 });
  });

  it('spills the remainder onto the other share', () => {
    expect(
      applyMagicModifier({ spellpower: 4, powerPoints: 2 }, 5, 'spellpower')
    ).toEqual({ spellpower: 0, powerPoints: 1 });
  });

  it('takes power points first when the gamemaster rules so', () => {
    expect(
      applyMagicModifier({ spellpower: 4, powerPoints: 2 }, 3, 'powerPoints')
    ).toEqual({ spellpower: 3, powerPoints: 0 });
  });

  it('raises both held shares for an aspected match', () => {
    expect(applyMagicModifier({ spellpower: 4, powerPoints: 2 }, -2)).toEqual({
      spellpower: 6,
      powerPoints: 4,
    });
  });

  it('grants no spellpower to an adept on an aspected match', () => {
    expect(applyMagicModifier({ spellpower: 0, powerPoints: 6 }, -2)).toEqual({
      spellpower: 0,
      powerPoints: 8,
    });
  });
});

describe('SR4Actor magic split accessors', () => {
  function makeActor(system) {
    const actor = Object.create(SR4Actor.prototype);
    actor.system = { ...system, derivedStats: computeMagicSplit(system) };
    actor.type = 'character';
    return actor;
  }

  const mysticAdept = () =>
    makeActor(
      makeSystem({
        magician: true,
        adept: true,
        spellpower: 4,
        powerPoints: 2,
      })
    );

  it('uses the derived spellpower for effective Magic', () => {
    const actor = mysticAdept();
    expect(actor.getSpellpower()).toBe(4);
    expect(actor.getPowerPoints()).toBe(2);
    expect(actor.getEffectiveMagic({ getFlag: () => ({}) })).toBe(4);
  });

  it('takes a Background Count reduction off the allocation', () => {
    const scene = { getFlag: () => ({ backgroundCount: 5 }) };
    const actor = mysticAdept();
    expect(actor.getEffectiveMagicSplit(scene)).toEqual({
      spellpower: 0,
      powerPoints: 1,
    });
    expect(actor.getEffectiveMagic(scene)).toBe(0);
    expect(actor.getEffectivePowerPoints(scene)).toBe(1);
  });

  it('costs a pure adept power points for every reduced Magic point', () => {
    const actor = makeActor(makeSystem({ adept: true }));
    const scene = { getFlag: () => ({ backgroundCount: 2 }) };
    expect(actor.getEffectivePowerPoints(scene)).toBe(4);
    expect(actor.getEffectiveMagic(scene)).toBe(0);
  });

  it('honours the per-scene reduction order set by the gamemaster', () => {
    const actor = mysticAdept();
    const scene = {
      getFlag: () => ({
        backgroundCount: 2,
        mysticAdeptReduction: 'powerPoints',
      }),
    };
    expect(actor.getEffectiveMagicSplit(scene)).toEqual({
      spellpower: 4,
      powerPoints: 0,
    });
  });

  it('leaves the stored allocation untouched', () => {
    const actor = mysticAdept();
    actor.getEffectiveMagicSplit({ getFlag: () => ({ backgroundCount: 3 }) });
    expect(actor.getSpellpower()).toBe(4);
    expect(actor.getPowerPoints()).toBe(2);
  });

  it('falls back to the Magic attribute without derived data', () => {
    const actor = Object.create(SR4Actor.prototype);
    actor.system = { sheetStats: { MAGIC: 5 }, magic: {} };
    actor.type = 'spirit';
    expect(actor.getSpellpower()).toBe(5);
  });

  it('resolves stored power points when derived data is missing', () => {
    const actor = Object.create(SR4Actor.prototype);
    actor.system = {
      sheetStats: { MAGIC: 6 },
      magic: { magician: true, adept: true, spellpower: 4, powerPoints: 2 },
    };
    actor.type = 'character';
    expect(actor.getPowerPoints()).toBe(2);
  });

  it('never hands out an invalid stored allocation as a fallback', () => {
    const actor = Object.create(SR4Actor.prototype);
    actor.system = {
      sheetStats: { MAGIC: 6 },
      magic: { magician: true, adept: true, spellpower: 6, powerPoints: 6 },
    };
    actor.type = 'character';
    expect(actor.getPowerPoints()).toBe(0);
  });
});

describe('mystic adepts and astral space', () => {
  it('gets no astral realm regardless of spellpower', () => {
    const actor = {
      type: 'character',
      items: [],
      system: makeSystem({
        magician: true,
        adept: true,
        spellpower: 5,
        powerPoints: 1,
      }),
    };
    expect(getAvailableRealms(actor)).not.toContain('astral');
  });
});
