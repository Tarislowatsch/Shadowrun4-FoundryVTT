import { genericItemSchema, genericWeaponSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * Properties shared by all weapon system data models (from genericWeaponSchema).
 * @typedef {object} SR4WeaponSystemBase
 * @property {number} damage
 * @property {string} damageType
 * @property {number} ap  - Armor Penetration value (negative = reduces effective armor)
 * @property {boolean} apHalf - When true, effective armor is halved instead (SR4 p.151 "-half")
 * @property {string} attackSkill
 * @property {'ballistic' | 'impact'} armorType
 */

/**
 * @typedef {SR4WeaponSystemBase & SR4RangedWeaponData} SR4RangedWeaponSystem
 * @typedef {SR4WeaponSystemBase & SR4MeleeWeaponData} SR4MeleeWeaponSystem
 */

/**
 * @typedef {object} SR4Weapon
 * @property {string} name
 * @property {string} type
 * @property {SR4RangedWeaponSystem | SR4MeleeWeaponSystem} system
 */

/** DataModel for ranged weapons (type: "Ranged Weapon"). */
export class SR4RangedWeaponData extends foundry.abstract.TypeDataModel {
  /** @type {boolean} */
  smartlink;
  /** @type {string} */
  mode;
  /** @type {number} */
  rc;
  /** @type {string} */
  ammo;
  /** @type {string} */
  range;

  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      smartlink: new fields.BooleanField({ initial: false }),
      mode: new fields.StringField({ initial: '' }),
      rc: new fields.NumberField({ initial: 0, integer: true }),
      ammo: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      armorType: new fields.StringField({
        initial: 'ballistic',
        choices: ['ballistic', 'impact'],
        blank: false,
      }),
    };
  }
}

/** DataModel for melee weapons (type: "Melee Weapon"). */
export class SR4MeleeWeaponData extends foundry.abstract.TypeDataModel {
  /** @type {number} */
  reach;
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      reach: new fields.NumberField({ initial: 0, integer: true }),
      armorType: new fields.StringField({
        initial: 'impact',
        choices: ['ballistic', 'impact'],
        blank: false,
      }),
    };
  }
}

const RANGED_WEAPON_TYPE = 'Ranged Weapon';

/**
 * Returns true when the item is a ranged weapon.
 * Use this to narrow the item type before accessing ranged-only properties
 * like `smartlink`, `mode`, or `ammo`.
 *
 * @param {SR4Weapon} item
 * @returns {item is { type: 'Ranged Weapon', system: SR4RangedWeaponSystem }}
 */
export function isRangedWeapon(item) {
  return item.type === RANGED_WEAPON_TYPE;
}

/**
 * Localisation keys for the combat skills used when attacking with a weapon.
 *
 * @enum {string}
 * @readonly
 */
export const Attackskill = Object.freeze({
  /** @type {string} */ PISTOLS: 'sr4.skills.pistols',
  /** @type {string} */ AUTOMATICS: 'sr4.skills.automatics',
  /** @type {string} */ BLADES: 'sr4.skills.blades',
  /** @type {string} */ CLUBS: 'sr4.skills.clubs',
  /** @type {string} */ UNARMED: 'sr4.skills.unarmedcombat',
  /** @type {string} */ THROWING: 'sr4.skills.throwing',
  /** @type {string} */ ARCHERY: 'sr4.skills.archery',
  /** @type {string} */ HEAVY_WEAPONS: 'sr4.skills.heavyweapons',
  /** @type {string} */ LONGARMS: 'sr4.skills.longarms',
  /** @type {string} */ EXOTIC_MELEE: 'sr4.skills.exoticmeleeweapon',
  /** @type {string} */ EXOTIC_RANGED: 'sr4.skills.exoticrangedweapon',
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
export const DamageTypes = Object.freeze({
  /** @type {string} */ PHYSICAL: 'sr4.damage.physical',
  /** @type {string} */ STUN: 'sr4.damage.stun',
  /** @type {string} */ ELECTRICITY: 'sr4.damage.electricity',
});
