import { describe, it, expect } from 'vitest';
import { buildWeaponContext } from '../src/sheets/characters/weapon-context.js';

function makeWeaponItem(id, type, overrides = {}) {
  return {
    _id: id,
    name: `${type} ${id}`,
    type,
    system: {
      damage: 6,
      ap: 0,
      rc: 0,
      smartlink: false,
      damageType: 'PHYSICAL',
      armorType: 'ballistic',
      attackSkill: 'pistols',
      mode: 'SEMI_AUTOMATIC',
      loadedAmmoId: '',
      installedModIds: [],
      cost: 100,
      noStrengthBonus: true,
      ...overrides,
    },
  };
}

function makeModItem(id, overrides = {}) {
  return {
    _id: id,
    name: `Mod ${id}`,
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

function makeAmmoItem(id, overrides = {}) {
  return {
    _id: id,
    name: `Ammo ${id}`,
    type: 'Ammo',
    system: {
      damageBonus: 0,
      apBonus: 0,
      damageTypeOverride: '',
      damageOverride: null,
      category: '',
      quantity: 10,
      ...overrides,
    },
  };
}

describe('buildWeaponContext ammo category filtering', () => {
  it.each([
    [
      'filters availableAmmo by matching category',
      'Heavy Pistols',
      [
        ['a1', 'Heavy Pistols'],
        ['a2', 'Shotguns'],
      ],
      ['a1'],
    ],
    [
      'shows uncategorized ammo for any weapon',
      'Heavy Pistols',
      [['a1', '']],
      ['a1'],
    ],
    [
      'shows all ammo for uncategorized weapon',
      '',
      [
        ['a1', 'Heavy Pistols'],
        ['a2', 'Shotguns'],
      ],
      ['a1', 'a2'],
    ],
  ])('%s', (_label, weaponCategory, ammoDefs, expectedIds) => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', { category: weaponCategory }),
      ...ammoDefs.map(([id, category]) => makeAmmoItem(id, { category })),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.availableAmmo.map((a) => a.id)).toEqual(expectedIds);
  });
});

describe('buildWeaponContext with mods', () => {
  it('resolves installed mods and computes effective values', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', { installedModIds: ['m1'] }),
      makeModItem('m1', { damageBonus: 2, apBonus: -1, rcBonus: 3 }),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.system.effectiveDamage).toBe(8);
    expect(w.system.effectiveAP).toBe(-1);
    expect(w.system.effectiveRC).toBe(3);
  });

  it('provides availableWeaponMods excluding installed ones', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', { installedModIds: ['m1'] }),
      makeModItem('m1'),
      makeModItem('m2'),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.availableWeaponMods).toHaveLength(1);
    expect(w.availableWeaponMods[0].id).toBe('m2');
  });

  it('provides installedMods list', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', { installedModIds: ['m1'] }),
      makeModItem('m1', { damageBonus: 1 }),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.installedMods).toHaveLength(1);
    expect(w.installedMods[0].name).toBe('Mod m1');
  });

  it('detects external mount conflict', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', { installedModIds: ['m1', 'm2'] }),
      makeModItem('m1', { mount: 'top' }),
      makeModItem('m2', { mount: 'top' }),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.system.modSlotWarning).toBe(true);
  });

  it('computes totalCost including mods', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', {
        cost: 100,
        installedModIds: ['m1'],
      }),
      makeModItem('m1', { cost: 200 }),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.system.totalCost).toBe(300);
  });

  it('grants smartlink via mod', () => {
    const items = [
      makeWeaponItem('w1', 'Ranged Weapon', {
        smartlink: false,
        installedModIds: ['m1'],
      }),
      makeModItem('m1', { grantsSmartlink: true }),
    ];
    const [w] = buildWeaponContext(items);
    expect(w.system.effectiveSmartlink).toBe(true);
  });
});
