import { describe, it, expect } from 'vitest';
import {
  getEquippedMeleeReach,
  computeReachModifier,
} from '../src/utils/weapons.js';

function makeActor(items = []) {
  return { items };
}

function meleeItem(reach, equipped = false) {
  return { type: 'Melee Weapon', system: { equipped, reach } };
}

describe('getEquippedMeleeReach', () => {
  it('returns reach of the equipped melee weapon', () => {
    const actor = makeActor([meleeItem(2, true)]);
    expect(getEquippedMeleeReach(actor)).toBe(2);
  });

  it('returns 0 when no melee weapon is equipped', () => {
    const actor = makeActor([meleeItem(3, false)]);
    expect(getEquippedMeleeReach(actor)).toBe(0);
  });

  it('returns 0 when actor has no melee weapons', () => {
    const actor = makeActor([
      { type: 'Ranged Weapon', system: { equipped: true, reach: 0 } },
    ]);
    expect(getEquippedMeleeReach(actor)).toBe(0);
  });

  it('returns 0 when actor has no items', () => {
    const actor = makeActor([]);
    expect(getEquippedMeleeReach(actor)).toBe(0);
  });

  it('picks the highest reach among equipped melee weapons', () => {
    const actor = makeActor([meleeItem(1, true), meleeItem(3, true)]);
    expect(getEquippedMeleeReach(actor)).toBe(3);
  });
});

describe('computeReachModifier', () => {
  it('returns positive when attacker has longer reach', () => {
    expect(computeReachModifier(3, 1)).toBe(2);
  });

  it('returns negative when attacker has shorter reach', () => {
    expect(computeReachModifier(1, 3)).toBe(-2);
  });

  it('returns 0 when reach is equal', () => {
    expect(computeReachModifier(2, 2)).toBe(0);
  });

  it('returns attacker reach when defender reach is 0 (unarmed)', () => {
    expect(computeReachModifier(2, 0)).toBe(2);
  });
});
