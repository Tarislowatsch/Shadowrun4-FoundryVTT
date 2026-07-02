import { describe, it, expect } from 'vitest';
import {
  isPhysicalDamageType,
  isRangedWeapon,
  AP_HALF_TYPES,
  SR4RangedWeaponData,
  SR4MeleeWeaponData,
} from '../src/models/items/weapons.model.js';

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

describe('isPhysicalDamageType', () => {
  it.each([
    ['PHYSICAL', true],
    ['FIRE', true],
    ['LASER', true],
    ['STUN', false],
    ['ELECTRICITY', false],
    ['STUN_HALF', false],
    ['', false],
  ])('%s → %s', (dt, expected) => {
    expect(isPhysicalDamageType(dt)).toBe(expected);
  });
});

describe('isRangedWeapon', () => {
  it('returns true for Ranged Weapon type', () => {
    expect(isRangedWeapon({ type: 'Ranged Weapon', system: {} })).toBe(true);
  });

  it('returns false for Melee Weapon type', () => {
    expect(isRangedWeapon({ type: 'Melee Weapon', system: {} })).toBe(false);
  });

  it('returns false for other types', () => {
    expect(isRangedWeapon({ type: 'armor', system: {} })).toBe(false);
  });
});

describe('AP_HALF_TYPES', () => {
  it.each(['ELECTRICITY', 'FIRE', 'LASER', 'STUN_HALF'])(
    'includes %s',
    (type) => expect(AP_HALF_TYPES.has(type)).toBe(true)
  );

  it.each(['PHYSICAL', 'STUN', ''])('excludes %s', (type) =>
    expect(AP_HALF_TYPES.has(type)).toBe(false)
  );
});

// ---------------------------------------------------------------------------
// SR4RangedWeaponData.prepareDerivedData
//
// TypeDataModel is mocked as an empty class. We create instances via
// Object.create so that instanceof checks and super calls work correctly.
// ---------------------------------------------------------------------------

/**
 * @param {object} weaponFields – overrides for the weapon's own properties
 * @param {object|null} ammoSystem – system data for a loaded ammo item, or null
 */
function prepareWeapon(weaponFields = {}, ammoSystem = null) {
  const self = Object.assign(Object.create(SR4RangedWeaponData.prototype), {
    damage: 6,
    ap: 0,
    damageType: 'PHYSICAL',
    armorType: 'ballistic',
    loadedAmmoId: ammoSystem ? 'loaded' : '',
    parent: ammoSystem
      ? {
          parent: {
            items: {
              get: (id) =>
                id === 'loaded'
                  ? { name: 'Test Ammo', system: ammoSystem }
                  : undefined,
            },
          },
        }
      : null,
    ...weaponFields,
  });
  self.prepareDerivedData();
  return self;
}

describe('SR4RangedWeaponData.prepareDerivedData', () => {
  describe('base weapon (no ammo)', () => {
    it('passes through base damage and AP unchanged', () => {
      const w = prepareWeapon({ damage: 8, ap: -2 });
      expect(w.effectiveDamage).toBe(8);
      expect(w.effectiveAP).toBe(-2);
    });

    it('loadedAmmoName is null when no ammo loaded', () => {
      expect(prepareWeapon().loadedAmmoName).toBeNull();
    });

    // Parametrised: weapon damage type → effectiveApHalf / effectiveArmorType
    it.each([
      ['PHYSICAL', 'ballistic', false, 'ballistic'],
      ['STUN', 'impact', false, 'impact'],
      ['FIRE', 'ballistic', true, 'impact'],
      ['LASER', 'ballistic', true, 'impact'],
      ['ELECTRICITY', 'ballistic', true, 'impact'],
      ['STUN_HALF', 'ballistic', true, 'impact'],
    ])(
      'damageType=%s armorType=%s → apHalf=%s, armorType=%s',
      (damageType, armorType, expectedApHalf, expectedArmorType) => {
        const w = prepareWeapon({ damageType, armorType });
        expect(w.effectiveDamageType).toBe(damageType);
        expect(w.effectiveApHalf).toBe(expectedApHalf);
        expect(w.effectiveArmorType).toBe(expectedArmorType);
      }
    );
  });

  describe('ammo overrides', () => {
    // Parametrised: various ammo configurations
    it.each([
      [
        'damage bonus (additive)',
        {},
        { damageBonus: 2 },
        { effectiveDamage: 8 }, // 6 + 2
      ],
      [
        'AP bonus',
        {},
        { apBonus: -4 },
        { effectiveAP: -4 }, // 0 + (-4)
      ],
      [
        'damage override replaces base',
        {},
        { damageOverride: 4, damageBonus: 99 }, // bonus ignored when override present
        { effectiveDamage: 4 },
      ],
      [
        'damageOverride=0 is treated as override (falsy but still a number)',
        {},
        { damageOverride: 0 },
        { effectiveDamage: 0 },
      ],
      [
        'damageOverride=null falls back to additive',
        {},
        { damageOverride: null, damageBonus: 1 },
        { effectiveDamage: 7 },
      ],
      [
        'type override: ELECTRICITY → apHalf, impact armor',
        {},
        { damageTypeOverride: 'ELECTRICITY' },
        {
          effectiveDamageType: 'ELECTRICITY',
          effectiveApHalf: true,
          effectiveArmorType: 'impact',
        },
      ],
      [
        'type override: FIRE → apHalf, impact armor',
        {},
        { damageTypeOverride: 'FIRE' },
        {
          effectiveDamageType: 'FIRE',
          effectiveApHalf: true,
          effectiveArmorType: 'impact',
        },
      ],
      [
        'empty type override falls back to weapon type',
        { damageType: 'STUN' },
        { damageTypeOverride: '' },
        { effectiveDamageType: 'STUN' },
      ],
      [
        'loadedAmmoName set to ammo item name',
        {},
        { damageBonus: 0 },
        { loadedAmmoName: 'Test Ammo' },
      ],
    ])('%s', (_label, weaponFields, ammoSystem, expectedFields) => {
      const w = prepareWeapon(weaponFields, ammoSystem);
      for (const [key, val] of Object.entries(expectedFields)) {
        expect(w[key]).toBe(val);
      }
    });

    describe('Stick-n-Shock (real-world scenario)', () => {
      // Stick-n-Shock: damageOverride=6, damageTypeOverride='ELECTRICITY'
      // → absolute 6S damage, Electricity rules, halved impact armor
      it('replaces damage, overrides type to ELECTRICITY, halves armor', () => {
        const w = prepareWeapon(
          { damage: 8, ap: 0, armorType: 'ballistic' },
          { damageOverride: 6, damageTypeOverride: 'ELECTRICITY', apBonus: 0 }
        );
        expect(w.effectiveDamage).toBe(6);
        expect(w.effectiveDamageType).toBe('ELECTRICITY');
        expect(w.effectiveApHalf).toBe(true);
        expect(w.effectiveArmorType).toBe('impact');
      });
    });

    describe('FIRE ammo (real-world scenario)', () => {
      // FIRE ammo: converts damage to physical, halves impact armor
      it('forces apHalf and impact armor regardless of weapon base', () => {
        const w = prepareWeapon(
          {
            damage: 10,
            ap: -2,
            armorType: 'ballistic',
            damageType: 'PHYSICAL',
          },
          { damageTypeOverride: 'FIRE', apBonus: 0 }
        );
        expect(w.effectiveDamageType).toBe('FIRE');
        expect(w.effectiveApHalf).toBe(true);
        expect(w.effectiveArmorType).toBe('impact');
        // base AP still preserved (apHalf overrides the AP value during soak, not here)
        expect(w.effectiveAP).toBe(-2);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// SR4MeleeWeaponData.prepareDerivedData
//
// Melee effective damage = weaponDamage
//   + (noStrengthBonus ? 0 : ceil(STR / 2))
//   + actor.system.modifiers.meleeDamageModifier
// ---------------------------------------------------------------------------

/**
 * @param {object} weaponFields – overrides for the weapon's own properties
 * @param {{ strength?: number, meleeDamageModifier?: number, unarmedDamageModifier?: number }|null} actorStats
 *   – actor attribute/modifier values, or null for an unowned item
 */
function prepareMeleeWeapon(weaponFields = {}, actorStats = null) {
  const self = Object.assign(Object.create(SR4MeleeWeaponData.prototype), {
    damage: 4,
    ap: 0,
    damageType: 'PHYSICAL',
    armorType: 'impact',
    attackSkill: 'blades',
    noStrengthBonus: false,
    parent: actorStats
      ? {
          parent: {
            getAttribute: (attr) =>
              attr === 'STRENGTH' ? (actorStats.strength ?? 0) : 0,
            system: {
              modifiers: {
                meleeDamageModifier: actorStats.meleeDamageModifier ?? 0,
                unarmedDamageModifier: actorStats.unarmedDamageModifier ?? 0,
              },
            },
          },
        }
      : null,
    ...weaponFields,
  });
  self.prepareDerivedData();
  return self;
}

describe('SR4MeleeWeaponData.prepareDerivedData', () => {
  it.each([
    [
      'adds ceil(STR/2) to weapon damage',
      { damage: 4 },
      { strength: 5 },
      7, // 4 + ceil(5/2)=3
    ],
    [
      'handles even Strength (no rounding)',
      { damage: 6 },
      { strength: 4 },
      8, // 6 + 2
    ],
    [
      'adds the melee damage modifier on top of the STR bonus',
      { damage: 4 },
      { strength: 5, meleeDamageModifier: 2 },
      9, // 4 + 3 + 2
    ],
    [
      'skips the STR bonus when noStrengthBonus is set',
      { damage: 4, noStrengthBonus: true },
      { strength: 5 },
      4, // STR bonus skipped
    ],
    [
      'still applies the modifier when noStrengthBonus is set',
      { damage: 4, noStrengthBonus: true },
      { strength: 5, meleeDamageModifier: 2 },
      6, // only the +2 modifier
    ],
    [
      'falls back to plain weapon damage for an unowned item',
      { damage: 4 },
      null,
      4,
    ],
    [
      'adds unarmedDamageModifier for unarmed weapons',
      { damage: 4, attackSkill: 'unarmedcombat' },
      { strength: 5, unarmedDamageModifier: 3 },
      10, // 4 + 3(STR) + 3(unarmed)
    ],
    [
      'ignores unarmedDamageModifier for non-unarmed weapons',
      { damage: 4, attackSkill: 'blades' },
      { strength: 5, unarmedDamageModifier: 3 },
      7, // 4 + 3(STR), no unarmed mod
    ],
  ])('%s', (_label, weaponFields, actorStats, expectedDamage) => {
    const w = prepareMeleeWeapon(weaponFields, actorStats);
    expect(w.effectiveDamage).toBe(expectedDamage);
  });

  it('derives apHalf / armorType from the damage type', () => {
    const w = prepareMeleeWeapon(
      { damage: 4, damageType: 'ELECTRICITY', armorType: 'ballistic' },
      { strength: 4 }
    );
    expect(w.effectiveDamageType).toBe('ELECTRICITY');
    expect(w.effectiveApHalf).toBe(true);
    expect(w.effectiveArmorType).toBe('impact');
  });
});
