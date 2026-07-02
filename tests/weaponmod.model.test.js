import { describe, it, expect } from 'vitest';
import {
  SR4RangedWeaponData,
  SR4MeleeWeaponData,
} from '../src/models/items/weapons.model.js';

function makeActor(items = []) {
  const map = new Map(items.map((i) => [i.id, i]));
  return {
    items: { get: (id) => map.get(id) },
    getAttribute: (attr) => (attr === 'STRENGTH' ? 4 : 0),
    system: {
      modifiers: {
        meleeDamageModifier: 0,
        unarmedDamageModifier: 0,
      },
    },
  };
}

function makeMod(id, overrides = {}) {
  return {
    id,
    type: 'Weapon Mod',
    system: {
      damageBonus: 0,
      apBonus: 0,
      rcBonus: 0,
      grantsSmartlink: false,
      mount: 'internal',
      cost: 0,
      ...overrides,
    },
  };
}

function prepareRanged(weaponFields = {}, mods = []) {
  const actor = makeActor(mods);
  const self = Object.assign(Object.create(SR4RangedWeaponData.prototype), {
    damage: 6,
    ap: 0,
    rc: 0,
    smartlink: false,
    damageType: 'PHYSICAL',
    armorType: 'ballistic',
    loadedAmmoId: '',
    installedModIds: mods.map((m) => m.id),
    cost: 100,
    parent: { parent: actor },
    ...weaponFields,
  });
  self.prepareDerivedData();
  return self;
}

function prepareMelee(weaponFields = {}, mods = []) {
  const actor = makeActor(mods);
  const self = Object.assign(Object.create(SR4MeleeWeaponData.prototype), {
    damage: 4,
    ap: 0,
    damageType: 'PHYSICAL',
    armorType: 'impact',
    attackSkill: 'blades',
    noStrengthBonus: true,
    installedModIds: mods.map((m) => m.id),
    cost: 50,
    parent: { parent: actor },
    ...weaponFields,
  });
  self.prepareDerivedData();
  return self;
}

describe('Ranged weapon with mods', () => {
  it('sums damage bonus from mods', () => {
    const mods = [
      makeMod('m1', { damageBonus: 1 }),
      makeMod('m2', { damageBonus: 2 }),
    ];
    const w = prepareRanged({}, mods);
    expect(w.effectiveDamage).toBe(9);
  });

  it('sums AP bonus from mods', () => {
    const mods = [makeMod('m1', { apBonus: -2 })];
    const w = prepareRanged({}, mods);
    expect(w.effectiveAP).toBe(-2);
  });

  it('computes effectiveRC from base + mods', () => {
    const mods = [makeMod('m1', { rcBonus: 2 }), makeMod('m2', { rcBonus: 1 })];
    const w = prepareRanged({ rc: 1 }, mods);
    expect(w.effectiveRC).toBe(4);
  });

  it('grants smartlink via mod', () => {
    const mods = [makeMod('m1', { grantsSmartlink: true })];
    const w = prepareRanged({ smartlink: false }, mods);
    expect(w.effectiveSmartlink).toBe(true);
  });

  it('preserves smartlink when already on weapon', () => {
    const w = prepareRanged({ smartlink: true }, []);
    expect(w.effectiveSmartlink).toBe(true);
  });

  it.each([
    ['no modSlotWarning for internal mods', ['internal', 'internal'], false],
    [
      'modSlotWarning when same external mount used twice',
      ['top', 'top'],
      true,
    ],
    [
      'no warning for different external mounts',
      ['top', 'barrel', 'under'],
      false,
    ],
  ])('%s', (_label, mounts, expected) => {
    const mods = mounts.map((mount, i) => makeMod(`m${i}`, { mount }));
    const w = prepareRanged({}, mods);
    expect(w.modSlotWarning).toBe(expected);
  });

  it('computes totalCost from weapon + mods', () => {
    const mods = [makeMod('m1', { cost: 200 }), makeMod('m2', { cost: 150 })];
    const w = prepareRanged({ cost: 100 }, mods);
    expect(w.totalCost).toBe(450);
  });

  it('sums usedModSlots for internal mods', () => {
    const mods = [
      makeMod('m1', { mount: 'internal', slotCost: 2 }),
      makeMod('m2', { mount: 'internal', slotCost: 3 }),
    ];
    const w = prepareRanged({}, mods);
    expect(w.usedModSlots).toBe(5);
  });

  it.each([
    [
      'modSlotWarning when internal slots exceed modSlots capacity',
      [4, 4],
      true,
    ],
    ['no warning when internal slots within modSlots capacity', [2, 3], false],
  ])('sets %s', (_label, slotCosts, expected) => {
    const mods = slotCosts.map((slotCost, i) =>
      makeMod(`m${i}`, { mount: 'internal', slotCost })
    );
    const w = prepareRanged({ modSlots: 6 }, mods);
    expect(w.modSlotWarning).toBe(expected);
  });

  it('does not count external mods towards usedModSlots', () => {
    const mods = [
      makeMod('m1', { mount: 'top', slotCost: 1 }),
      makeMod('m2', { mount: 'internal', slotCost: 2 }),
    ];
    const w = prepareRanged({}, mods);
    expect(w.usedModSlots).toBe(2);
  });

  it('works with no mods installed', () => {
    const w = prepareRanged({});
    expect(w.effectiveDamage).toBe(6);
    expect(w.effectiveAP).toBe(0);
    expect(w.effectiveRC).toBe(0);
    expect(w.effectiveSmartlink).toBe(false);
    expect(w.usedModSlots).toBe(0);
    expect(w.modSlotWarning).toBe(false);
    expect(w.totalCost).toBe(100);
  });
});

describe('Melee weapon with mods', () => {
  it('sums damage bonus from mods', () => {
    const mods = [makeMod('m1', { damageBonus: 3 })];
    const w = prepareMelee({}, mods);
    expect(w.effectiveDamage).toBe(7);
  });

  it('sums AP bonus from mods', () => {
    const mods = [makeMod('m1', { apBonus: -1 })];
    const w = prepareMelee({}, mods);
    expect(w.effectiveAP).toBe(-1);
  });

  it('sets modSlotWarning for duplicate external mount', () => {
    const mods = [
      makeMod('m1', { mount: 'under' }),
      makeMod('m2', { mount: 'under' }),
    ];
    const w = prepareMelee({}, mods);
    expect(w.modSlotWarning).toBe(true);
  });

  it('computes totalCost', () => {
    const mods = [makeMod('m1', { cost: 75 })];
    const w = prepareMelee({ cost: 50 }, mods);
    expect(w.totalCost).toBe(125);
  });
});
