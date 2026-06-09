import { genericItemSchema, genericWeaponSchema } from '@models/shared';

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4Weapon
 * @property {string} name
 * @property {string} type
 * @property {SR4RangedWeaponData | SR4MeleeWeaponData} system
 */

/** DataModel for ranged weapons (type: "Ranged Weapon"). */
export class SR4RangedWeaponData extends foundry.abstract.TypeDataModel {
  /** @type {boolean} */
  smartlink;
  /** @type {string} */
  mode;
  /** @type {string} */
  rc;
  /** @type {string} */
  ammo;
  /** @type {string} */
  range;

  prepareBaseData() {
    const source = this.parent?._source?.system ?? {};
    this.rc = source.rc ?? '';
    this.mode = source.mode ?? '';
    this.ammo = source.ammo ?? '';
    this.range = source.range ?? '';
    this.smartlink = source.smartlink ?? false;
  }

  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      smartlink: new fields.BooleanField({ initial: false }),
      mode: new fields.StringField({ initial: '' }),
      rc: new fields.StringField({ initial: '' }),
      ammo: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
    };
  }
}

/** DataModel for melee weapons (type: "Melee Weapon"). */
export class SR4MeleeWeaponData extends foundry.abstract.TypeDataModel {
  /** @type {string} */
  reach;
  static defineSchema() {
    return {
      ...genericItemSchema(),
      ...genericWeaponSchema(),
      reach: new fields.StringField({ initial: '' }),
    };
  }
}

export const RANGED_WEAPON_TYPE = 'Ranged Weapon';

/**
 * Returns true when the item is a ranged weapon.
 * Use this to narrow the item type before accessing ranged-only properties
 * like `smartlink`, `mode`, or `ammo`.
 *
 * @param {{ type: string, system: SR4RangedWeaponData | SR4MeleeWeaponData }} item
 * @returns {item is { type: 'Ranged Weapon', system: SR4RangedWeaponData }}
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
