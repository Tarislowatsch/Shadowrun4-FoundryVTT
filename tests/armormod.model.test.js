import { describe, it, expect } from 'vitest';
import { SR4ArmorData } from '../src/models/items/armor.model.js';

function makeMod(id, overrides = {}) {
  return {
    id,
    type: 'Armor Mod',
    system: {
      ballisticBonus: 0,
      impactBonus: 0,
      capacityCost: 1,
      cost: 0,
      ...overrides,
    },
  };
}

function prepareArmor(armorFields = {}, mods = []) {
  const map = new Map(mods.map((m) => [m.id, m]));
  const actor = { items: { get: (id) => map.get(id) } };
  const self = Object.assign(Object.create(SR4ArmorData.prototype), {
    ballisticarmor: 8,
    impactarmor: 6,
    capacity: null,
    cost: 500,
    installedModIds: mods.map((m) => m.id),
    parent: { parent: actor },
    ...armorFields,
  });
  self.prepareDerivedData();
  return self;
}

describe('SR4ArmorData with mods', () => {
  it('computes effective ballistic from base + mods', () => {
    const mods = [makeMod('m1', { ballisticBonus: 2 })];
    const a = prepareArmor({}, mods);
    expect(a.effectiveBallistic).toBe(10);
  });

  it('computes effective impact from base + mods', () => {
    const mods = [makeMod('m1', { impactBonus: 3 })];
    const a = prepareArmor({}, mods);
    expect(a.effectiveImpact).toBe(9);
  });

  it.each([
    ['defaults to max(ballistic, impact) when capacity is null', null, 8],
    ['uses explicit capacity when set', 12, 12],
  ])('maxCapacity %s', (_label, capacity, expected) => {
    const a = prepareArmor({ ballisticarmor: 8, impactarmor: 6, capacity }, []);
    expect(a.maxCapacity).toBe(expected);
  });

  it('sums usedCapacity from mods', () => {
    const mods = [
      makeMod('m1', { capacityCost: 2 }),
      makeMod('m2', { capacityCost: 3 }),
    ];
    const a = prepareArmor({}, mods);
    expect(a.usedCapacity).toBe(5);
  });

  it.each([
    ['sets capacityWarning when usedCapacity > maxCapacity', [5, 5], true],
    ['no capacityWarning when within capacity', [2], false],
  ])('%s', (_label, capacityCosts, expected) => {
    const mods = capacityCosts.map((capacityCost, i) =>
      makeMod(`m${i}`, { capacityCost })
    );
    const a = prepareArmor({ ballisticarmor: 8, impactarmor: 6 }, mods);
    expect(a.capacityWarning).toBe(expected);
  });

  it('computes totalCost from armor + mods', () => {
    const mods = [makeMod('m1', { cost: 200 }), makeMod('m2', { cost: 100 })];
    const a = prepareArmor({ cost: 500 }, mods);
    expect(a.totalCost).toBe(800);
  });

  it('works with no mods', () => {
    const a = prepareArmor({});
    expect(a.effectiveBallistic).toBe(8);
    expect(a.effectiveImpact).toBe(6);
    expect(a.usedCapacity).toBe(0);
    expect(a.capacityWarning).toBe(false);
    expect(a.totalCost).toBe(500);
  });
});
