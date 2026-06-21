import { genericItemSchema, genericWeaponSchema } from '@models/shared';
import {
  AP_HALF_TYPES,
  computeRangedWeaponDerived,
  computeMeleeWeaponDerived,
} from '@models/shared/weapon-armor-derived';

const fields = foundry.data.fields;

/**
 * Properties shared by all weapon system data models (from genericWeaponSchema).
 * @typedef {object} SR4WeaponSystemBase
 * @property {number} damage
 * @property {string} damageType
 * @property {number} ap  - Armor Penetration value (negative = reduces effective armor)
 * @property {string} attackSkill
 * @property {'ballistic' | 'impact'} armorType
 */

/**
 * @typedef {object} SR4RangedWeaponFields
 * @property {boolean} smartlink
 * @property {string} mode
 * @property {number} rc
 * @property {number} maxAmmo
 * @property {number} currentAmmo
 * @property {string} ammoFeed
 * @property {string} range
 * @property {string} loadedAmmoId
 * @property {string[]} installedModIds
 * @property {number} effectiveDamage
 * @property {number} effectiveAP
 * @property {number} effectiveRC
 * @property {boolean} effectiveSmartlink
 * @property {string} effectiveDamageType
 * @property {boolean} effectiveApHalf
 * @property {string} effectiveArmorType
 * @property {string|null} loadedAmmoName
 * @property {boolean} modSlotWarning
 * @property {number} totalCost
 */

/**
 * @typedef {object} SR4MeleeWeaponFields
 * @property {number} reach
 * @property {boolean} noStrengthBonus - When true, the Strength damage bonus is not applied.
 * @property {string[]} installedModIds
 * @property {number} effectiveDamage
 * @property {number} effectiveAP
 * @property {string} effectiveDamageType
 * @property {boolean} effectiveApHalf
 * @property {string} effectiveArmorType
 * @property {boolean} modSlotWarning
 * @property {number} totalCost
 */

/**
 * @typedef {SR4WeaponSystemBase & SR4RangedWeaponFields} SR4RangedWeaponSystem
 * @typedef {SR4WeaponSystemBase & SR4MeleeWeaponFields} SR4MeleeWeaponSystem
 */

/**
 * @typedef {object} SR4Weapon
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {SR4RangedWeaponSystem | SR4MeleeWeaponSystem} system
 * @property {(data: Record<string, unknown>) => Promise<SR4Weapon>} update
 */

/**
 * DataModel for ranged weapons (type: "Ranged Weapon").
 * @property {boolean} smartlink
 * @property {string} mode
 * @property {number} rc
 * @property {number} maxAmmo
 * @property {number} currentAmmo
 * @property {string} ammoFeed - Feed type abbreviation (e.g. "c", "m", "belt", "cy", "d")
 * @property {string} range
 */
export { AP_HALF_TYPES };

export class SR4RangedWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      smartlink: new fields.BooleanField({ initial: false }),
      mode: new fields.StringField({ initial: '' }),
      rc: new fields.NumberField({ initial: 0, integer: true }),
      maxAmmo: new fields.NumberField({ initial: 0, integer: true }),
      currentAmmo: new fields.NumberField({ initial: 0, integer: true }),
      ammoFeed: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      armorType: new fields.StringField({
        initial: 'ballistic',
        choices: ['ballistic', 'impact'],
        blank: false,
      }),
      loadedAmmoId: new fields.StringField({ initial: '' }),
    };
  }

  prepareDerivedData() {
    /** @type {SR4RangedWeaponSystem & Record<string, unknown>} */
    const self = /** @type {any} */ (this);
    /** @type {any} */
    const actor = this.parent?.parent ?? null;
    const ammo = self.loadedAmmoId
      ? (actor?.items?.get(self.loadedAmmoId) ?? null)
      : null;

    const mods = resolveWeaponMods(self.installedModIds, actor);

    Object.assign(self, computeRangedWeaponDerived(self, ammo, mods));
  }
}

/**
 * DataModel for melee weapons (type: "Melee Weapon").
 * @property {number} reach
 * @property {boolean} noStrengthBonus
 */
export class SR4MeleeWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      reach: new fields.NumberField({ initial: 0, integer: true }),
      noStrengthBonus: new fields.BooleanField({ initial: false }),
      armorType: new fields.StringField({
        initial: 'impact',
        choices: ['ballistic', 'impact'],
        blank: false,
      }),
    };
  }

  prepareDerivedData() {
    const self = /** @type {any} */ (this);
    const actor = this.parent?.parent ?? null;

    const strengthBonus = actor
      ? Math.ceil((actor.getAttribute('STRENGTH') ?? 0) / 2)
      : 0;
    const meleeDamageModifier = actor
      ? (actor.system.modifiers?.meleeDamageModifier ?? 0)
      : 0;
    const unarmedDamageModifier = actor
      ? (actor.system.modifiers?.unarmedDamageModifier ?? 0)
      : 0;

    const mods = resolveWeaponMods(self.installedModIds, actor);

    Object.assign(
      self,
      computeMeleeWeaponDerived(self, mods, {
        strengthBonus,
        meleeDamageModifier,
        unarmedDamageModifier,
      })
    );
  }
}

/** @param {string[]} ids @param {any} actor */
function resolveWeaponMods(ids, actor) {
  return (ids ?? [])
    .map((id) => actor?.items?.get(id))
    .filter((m) => m?.type === 'Weapon Mod');
}

const RANGED_WEAPON_TYPE = 'Ranged Weapon';

/**
 * @param {SR4Weapon} item
 * @returns {item is SR4Weapon & { type: 'Ranged Weapon', system: SR4RangedWeaponSystem }}
 */
export function isRangedWeapon(item) {
  return item.type === RANGED_WEAPON_TYPE;
}

/** @param {string} dt */
export function isPhysicalDamageType(dt) {
  return dt === 'PHYSICAL' || dt === 'FIRE' || dt === 'LASER';
}

/**
 * Localisation keys for ranged weapon attack skills.
 *
 * @enum {string}
 * @readonly
 */
export const RangedAttackskill = Object.freeze({
  /** @type {string} */ NONE: 'sr4.attack.none',
  /** @type {string} */ PISTOLS: 'sr4.skills.pistols',
  /** @type {string} */ AUTOMATICS: 'sr4.skills.automatics',
  /** @type {string} */ THROWING: 'sr4.skills.throwingweapons',
  /** @type {string} */ ARCHERY: 'sr4.skills.archery',
  /** @type {string} */ HEAVY_WEAPONS: 'sr4.skills.heavyweapons',
  /** @type {string} */ LONGARMS: 'sr4.skills.longarms',
  /** @type {string} */ GUNNERY: 'sr4.skills.gunnery',
  /** @type {string} */ EXOTIC_RANGED: 'sr4.skills.exoticrangedweapon',
});

/**
 * Localisation keys for melee weapon attack skills.
 *
 * @enum {string}
 * @readonly
 */
export const MeleeAttackskill = Object.freeze({
  /** @type {string} */ NONE: 'sr4.attack.none',
  /** @type {string} */ BLADES: 'sr4.skills.blades',
  /** @type {string} */ CLUBS: 'sr4.skills.clubs',
  /** @type {string} */ UNARMED: 'sr4.skills.unarmedcombat',
  /** @type {string} */ EXOTIC_MELEE: 'sr4.skills.exoticmeleeweapon',
});

/**
 * All weapon attack skills combined (ranged + melee), used for lookups.
 *
 * @enum {string}
 * @readonly
 */
export const Attackskill = Object.freeze({
  ...RangedAttackskill,
  ...MeleeAttackskill,
});

/**
 * Localisation keys for the available ranged weapon firing modes.
 *
 * @enum {string}
 * @readonly
 */
export const Shootingmodes = Object.freeze({
  /** @type {string} */ SINGLE_SHOT: 'sr4.shooting.single',
  /** @type {string} */ SEMI_AUTOMATIC: 'sr4.shooting.semi',
  /** @type {string} */ BURST_FIRE: 'sr4.shooting.burst',
  /** @type {string} */ FULL_AUTO: 'sr4.shooting.full',
  /** @type {string} */ SEMI_BURST_FULL_AUTO: 'sr4.shooting.semi-burst-full',
  /** @type {string} */ SEMI_BURST: 'sr4.shooting.semi-burst',
});

/**
 * Localisation keys for the damage types a weapon can inflict.
 *
 * @enum {string}
 * @readonly
 */
export const WeaponMountPoints = Object.freeze({
  /** @type {string} */ top: 'sr4.weaponmod.mountPoints.top',
  /** @type {string} */ barrel: 'sr4.weaponmod.mountPoints.barrel',
  /** @type {string} */ under: 'sr4.weaponmod.mountPoints.under',
  /** @type {string} */ internal: 'sr4.weaponmod.mountPoints.internal',
});

export const DamageTypes = Object.freeze({
  /** @type {string} */ PHYSICAL: 'sr4.damage.physical',
  /** @type {string} */ STUN: 'sr4.damage.stun',
  /** @type {string} */ ELECTRICITY: 'sr4.damage.electricity',
  /** @type {string} */ FIRE: 'sr4.damage.fire',
  /** @type {string} */ LASER: 'sr4.damage.laser',
  /** @type {string} */ STUN_HALF: 'sr4.damage.stun_half',
});
