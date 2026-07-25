import { describe, it, expect } from 'vitest';
import {
  rangeDefenseModifier,
  baseDefenseModifier,
  skillDefenseModifier,
} from '../src/domains/combat/dialogs/defense.js';
import { computeFinalPool } from '../src/utils/dialog/pool-math.js';

/** @param {Record<string, number>} [overrides] */
function makeMods(overrides = {}) {
  return {
    defenseModifier: 0,
    meleeDefenseModifier: 0,
    rangedDefenseModifier: 0,
    dodgeModifier: 0,
    blockModifier: 0,
    parryModifier: 0,
    ...overrides,
  };
}

describe('rangeDefenseModifier', () => {
  it('uses meleeDefenseModifier vs a melee attack', () => {
    const mods = makeMods({
      meleeDefenseModifier: 3,
      rangedDefenseModifier: 9,
    });
    expect(rangeDefenseModifier(mods, true)).toBe(3);
  });

  it('uses rangedDefenseModifier vs a ranged attack', () => {
    const mods = makeMods({
      meleeDefenseModifier: 3,
      rangedDefenseModifier: 9,
    });
    expect(rangeDefenseModifier(mods, false)).toBe(9);
  });

  it('defaults to 0 when the field is missing', () => {
    expect(rangeDefenseModifier({}, true)).toBe(0);
    expect(rangeDefenseModifier({}, false)).toBe(0);
  });
});

describe('baseDefenseModifier', () => {
  it('sums generic defenseModifier and the range-specific one', () => {
    const mods = makeMods({ defenseModifier: 1, meleeDefenseModifier: 2 });
    expect(baseDefenseModifier(mods, true)).toBe(3);
  });

  it('ignores the opposite range modifier', () => {
    const mods = makeMods({ defenseModifier: 1, rangedDefenseModifier: 5 });
    expect(baseDefenseModifier(mods, true)).toBe(1); // ranged ignored vs melee
  });

  it('defaults missing fields to 0', () => {
    expect(baseDefenseModifier({}, false)).toBe(0);
  });
});

describe('skillDefenseModifier', () => {
  const mods = makeMods({
    dodgeModifier: 1,
    blockModifier: 2,
    parryModifier: 3,
  });

  it.each([
    ['dodge', 1],
    ['gymnastics', 1],
    ['unarmedcombat', 2],
    ['blades', 3],
    ['clubs', 3],
    ['exoticmeleeweapon', 3],
  ])('maps %s to its defense modifier (%i)', (skillKey, expected) => {
    expect(skillDefenseModifier(mods, skillKey)).toBe(expected);
  });

  it('returns 0 for an unknown skill', () => {
    expect(skillDefenseModifier(mods, 'spellcasting')).toBe(0);
  });

  it('returns 0 when no skill is selected', () => {
    expect(skillDefenseModifier(mods, undefined)).toBe(0);
  });

  it('defaults a mapped-but-missing modifier to 0', () => {
    expect(skillDefenseModifier({}, 'dodge')).toBe(0);
  });
});

describe('defense modifier sign convention (end-to-end via computeFinalPool)', () => {
  // The dialog assembles malus as: baseMalus - baseDefenseModifier(...).
  // computeFinalPool then subtracts malus, so a positive modifier must raise
  // the pool (bonus) and a negative one must lower it (malus). This locks the
  // same +X=bonus / -X=malus convention that attackModifier also relies on.
  const roll = (mods, isMelee) =>
    computeFinalPool(10, {
      bonus: 0,
      malus: 0 - baseDefenseModifier(mods, isMelee),
      specialization: false,
      smartlink: false,
      explode: false,
      maxEdge: 0,
    });

  it('positive defense modifier increases the pool', () => {
    expect(roll(makeMods({ defenseModifier: 2 }), false)).toBe(12);
  });

  it('negative defense modifier decreases the pool', () => {
    expect(roll(makeMods({ defenseModifier: -2 }), false)).toBe(8);
  });

  it('melee defense modifier only affects melee defenses', () => {
    const mods = makeMods({ meleeDefenseModifier: 3 });
    expect(roll(mods, true)).toBe(13);
    expect(roll(mods, false)).toBe(10);
  });
});
