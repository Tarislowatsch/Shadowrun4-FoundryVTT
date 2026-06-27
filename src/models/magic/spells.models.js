/**
 * @fileoverview Localisation key constants for Shadowrun 4e spell enumerations.
 * Converted from TypeScript enums to frozen const objects — runtime-available.
 */

import { genericItemSchema } from '@models/shared';

/**
 * Localisation keys for combat spell types (Direct vs Indirect).
 *
 * @enum {string}
 * @readonly
 */
export const SpellCombatTypes = Object.freeze({
  /** @type {string} */ DIRECT: 'sr4.spell.combatTypes.direct',
  /** @type {string} */ INDIRECT: 'sr4.spell.combatTypes.indirect',
});

/**
 * @enum {string}
 * @readonly
 */
export const SpellCategories = Object.freeze({
  /** @type {string} */ COMBAT: 'sr4.spell.categories.combat',
  /** @type {string} */ ILLUSION: 'sr4.spell.categories.illusion',
  /** @type {string} */ DETECTION: 'sr4.spell.categories.detection',
  /** @type {string} */ HEALTH: 'sr4.spell.categories.health',
  /** @type {string} */ GEOMANCY: 'sr4.spell.categories.geomancy',
  /** @type {string} */ MANIPULATION: 'sr4.spell.categories.manipulation',
});

/**
 * Localisation keys for spell types (Physical vs Mana).
 *
 * @enum {string}
 * @readonly
 */
export const SpellTypes = Object.freeze({
  /** @type {string} */ PHYSICAL: 'sr4.spell.types.physical',
  /** @type {string} */ MANA: 'sr4.spell.types.mana',
});

/**
 * @enum {string}
 * @readonly
 */
export const SpellElements = Object.freeze({
  /** @type {string} */ ELECTRICITY: 'sr4.spell.elements.electricity',
  /** @type {string} */ ACID: 'sr4.spell.elements.acid',
  /** @type {string} */ FIRE: 'sr4.spell.elements.fire',
  /** @type {string} */ RADIATION: 'sr4.spell.elements.radiation',
  /** @type {string} */ SOUND: 'sr4.spell.elements.sound',
  /** @type {string} */ BLAST: 'sr4.spell.elements.blast',
  /** @type {string} */ ICE: 'sr4.spell.elements.ice',
  /** @type {string} */ LIGHT: 'sr4.spell.elements.light',
  /** @type {string} */ METAL: 'sr4.spell.elements.metal',
  /** @type {string} */ SAND: 'sr4.spell.elements.sand',
  /** @type {string} */ SMOKE: 'sr4.spell.elements.smoke',
  /** @type {string} */ WATER: 'sr4.spell.elements.water',
});

/**
 * Localisation keys for spell range types.
 *
 * @enum {string}
 * @readonly
 */
export const SpellRanges = Object.freeze({
  /** @type {string} */ TOUCH: 'sr4.spell.ranges.touch',
  /** @type {string} */ LOS: 'sr4.spell.ranges.los',
  /** @type {string} */ AREA: 'sr4.spell.ranges.area',
  /** @type {string} */ SELF: 'sr4.spell.ranges.self',
});

/**
 * Localisation keys for spell duration types.
 *
 * @enum {string}
 * @readonly
 */
export const SpellDurations = Object.freeze({
  /** @type {string} */ INSTANT: 'sr4.spell.durations.instant',
  /** @type {string} */ SUSTAINED: 'sr4.spell.durations.sustained',
  /** @type {string} */ PERMANENT: 'sr4.spell.durations.permanent',
});

/**
 * Available magical traditions.
 *
 * @readonly
 * @enum {string}
 */
export const Traditions = Object.freeze({
  NONE: '',
  HERMETIC: 'hermetic',
  SHAMAN: 'shaman',
  WICCA: 'wicca',
  CHAOS: 'chaos',
});

/**
 * Localization keys for magical traditions.
 *
 * @readonly
 * @enum {string}
 */
export const TraditionLabels = Object.freeze({
  [Traditions.NONE]: 'sr4.magic.traditions.none',
  [Traditions.HERMETIC]: 'sr4.magic.traditions.hermetic',
  [Traditions.SHAMAN]: 'sr4.magic.traditions.shaman',
  [Traditions.WICCA]: 'sr4.magic.traditions.wicca',
  [Traditions.CHAOS]: 'sr4.magic.traditions.chaos',
});

/**
 * Localization keys for drain attributes.
 *
 * @readonly
 * @enum {string}
 */
export const DrainAttributes = Object.freeze({
  /** @type {string} Localisation key for the Logic attribute. */
  LOGIC: 'sr4.attributeAbr.logic',
  /** @type {string} Localisation key for the Intuition attribute. */
  INTUITION: 'sr4.attributeAbr.intuition',
  /** @type {string} Localisation key for the Charisma attribute. */
  CHARISMA: 'sr4.attributeAbr.charisma',
});

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4SpellSystemData
 * @property {string} category    - Spell category (e.g. 'COMBAT', 'DETECTION')
 * @property {string} type        - Spell type (e.g. 'PHYSICAL', 'MANA')
 * @property {string} combatType  - Combat sub-type: 'DIRECT' or 'INDIRECT' (COMBAT spells only)
 * @property {string} range       - Spell range (e.g. 'TOUCH', 'LOS')
 * @property {string} element     - Elemental type, empty string if none (required for INDIRECT)
 * @property {boolean} area       - Whether the spell has an area of effect
 * @property {string} duration    - Spell duration (e.g. 'PERMANENT', 'SUSTAINED')
 * @property {number} dv          - Drain value (integer)
 * @property {string} damageType  - 'PHYSICAL' or 'STUN' (COMBAT spells; base DV = cast Force)
 * @property {boolean} opposed    - Whether non-combat spells require an Opposed Test
 */

/**
 * @typedef {object} SR4Spell
 * @property {string} name
 * @property {string} type
 * @property {SR4SpellSystemData} system
 * @property {() => object} toObject
 */
/** DataModel for spells (type: "Spell"). */
export class SR4SpellData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.damageType === undefined && source.damage !== undefined) {
      source.damageType = source.damage === 'S' ? 'STUN' : 'PHYSICAL';
    }
    if (
      source.combatType === undefined &&
      typeof source.descriptor === 'string'
    ) {
      source.combatType = source.descriptor.toLowerCase().includes('indirect')
        ? 'INDIRECT'
        : 'DIRECT';
    }
    if (typeof source.category === 'string') {
      source.category = source.category.toUpperCase();
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      ...genericItemSchema(),
      category: new fields.StringField({ initial: 'COMBAT' }),
      type: new fields.StringField({ initial: 'PHYSICAL' }),
      combatType: new fields.StringField({ initial: 'DIRECT' }),
      range: new fields.StringField({ initial: 'TOUCH' }),
      element: new fields.StringField({ initial: '' }),
      area: new fields.BooleanField({ initial: false }),
      duration: new fields.StringField({ initial: 'PERMANENT' }),
      dv: new fields.NumberField({ initial: 2, integer: true }),
      damageType: new fields.StringField({ initial: 'PHYSICAL' }),
      opposed: new fields.BooleanField({ initial: false }),
      limited: new fields.BooleanField({ initial: false }),
    };
  }
}
