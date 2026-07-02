/**
 * @fileoverview Localisation key constants for Shadowrun 4e spell enumerations.
 * Converted from TypeScript enums to frozen const objects — runtime-available.
 */

import { genericItemSchema, SecondaryAttributes } from '@models/shared';

/**
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
 * @enum {string}
 * @readonly
 */
export const SpellDurations = Object.freeze({
  /** @type {string} */ INSTANT: 'sr4.spell.durations.instant',
  /** @type {string} */ SUSTAINED: 'sr4.spell.durations.sustained',
  /** @type {string} */ PERMANENT: 'sr4.spell.durations.permanent',
});

/**
 * @readonly
 * @enum {string}
 */
export const Traditions = Object.freeze({
  NONE: '',
  ABORIGINAL: 'ABORIGINAL',
  AZTEC: 'AZTEC',
  BLACK_MAGIC: 'BLACK_MAGIC',
  BUDDHIST: 'BUDDHIST',
  CHAOS_MAGIC: 'CHAOS_MAGIC',
  CHRISTIAN_THEURGY: 'CHRISTIAN_THEURGY',
  DRUIDIC: 'DRUIDIC',
  EGYPTIAN: 'EGYPTIAN',
  GARDNERIAN_WICCA: 'GARDNERIAN_WICCA',
  GODDESS_WICCA: 'GODDESS_WICCA',
  HERMETIC: 'HERMETIC',
  HINDU: 'HINDU',
  INSECT: 'INSECT',
  ISLAMIC: 'ISLAMIC',
  NORSE: 'NORSE',
  PATH_OF_THE_WHEEL: 'PATH_OF_THE_WHEEL',
  POISONER: 'POISONER',
  PSIONIC: 'PSIONIC',
  QABBALISTIC: 'QABBALISTIC',
  RASTAFARIAN: 'RASTAFARIAN',
  SHAMANIC: 'SHAMANIC',
  SHINTO: 'SHINTO',
  VOODOO: 'VOODOO',
  WITCHCRAFT: 'WITCHCRAFT',
  WUXING: 'WUXING',
  ZOROASTRIAN: 'ZOROASTRIAN',
});

/**
 * @readonly
 * @enum {string}
 */
export const TraditionLabels = Object.freeze({
  [Traditions.NONE]: 'sr4.magic.traditions.none',
  [Traditions.ABORIGINAL]: 'sr4.magic.traditions.ABORIGINAL',
  [Traditions.AZTEC]: 'sr4.magic.traditions.AZTEC',
  [Traditions.BLACK_MAGIC]: 'sr4.magic.traditions.BLACK_MAGIC',
  [Traditions.BUDDHIST]: 'sr4.magic.traditions.BUDDHIST',
  [Traditions.CHAOS_MAGIC]: 'sr4.magic.traditions.CHAOS_MAGIC',
  [Traditions.CHRISTIAN_THEURGY]: 'sr4.magic.traditions.CHRISTIAN_THEURGY',
  [Traditions.DRUIDIC]: 'sr4.magic.traditions.DRUIDIC',
  [Traditions.EGYPTIAN]: 'sr4.magic.traditions.EGYPTIAN',
  [Traditions.GARDNERIAN_WICCA]: 'sr4.magic.traditions.GARDNERIAN_WICCA',
  [Traditions.GODDESS_WICCA]: 'sr4.magic.traditions.GODDESS_WICCA',
  [Traditions.HERMETIC]: 'sr4.magic.traditions.HERMETIC',
  [Traditions.HINDU]: 'sr4.magic.traditions.HINDU',
  [Traditions.INSECT]: 'sr4.magic.traditions.INSECT',
  [Traditions.ISLAMIC]: 'sr4.magic.traditions.ISLAMIC',
  [Traditions.NORSE]: 'sr4.magic.traditions.NORSE',
  [Traditions.PATH_OF_THE_WHEEL]: 'sr4.magic.traditions.PATH_OF_THE_WHEEL',
  [Traditions.POISONER]: 'sr4.magic.traditions.POISONER',
  [Traditions.PSIONIC]: 'sr4.magic.traditions.PSIONIC',
  [Traditions.QABBALISTIC]: 'sr4.magic.traditions.QABBALISTIC',
  [Traditions.RASTAFARIAN]: 'sr4.magic.traditions.RASTAFARIAN',
  [Traditions.SHAMANIC]: 'sr4.magic.traditions.SHAMANIC',
  [Traditions.SHINTO]: 'sr4.magic.traditions.SHINTO',
  [Traditions.VOODOO]: 'sr4.magic.traditions.VOODOO',
  [Traditions.WITCHCRAFT]: 'sr4.magic.traditions.WITCHCRAFT',
  [Traditions.WUXING]: 'sr4.magic.traditions.WUXING',
  [Traditions.ZOROASTRIAN]: 'sr4.magic.traditions.ZOROASTRIAN',
});

/**
 * @readonly
 * @enum {string}
 */
export const DrainAttributes = Object.freeze({
  LOGIC: SecondaryAttributes.LOGIC,
  INTUITION: SecondaryAttributes.INTUITION,
  CHARISMA: SecondaryAttributes.CHARISMA,
});

const fields = foundry.data.fields;

/**
 * @typedef {object} SR4SpellSystemData
 * @property {string} category
 * @property {string} type
 * @property {string} combatType
 * @property {string} range
 * @property {string} element
 * @property {boolean} area
 * @property {string} duration
 * @property {number} dv
 * @property {string} damageType
 * @property {boolean} opposed
 */

/**
 * @typedef {object} SR4Spell
 * @property {string} name
 * @property {string} type
 * @property {SR4SpellSystemData} system
 * @property {() => object} toObject
 */
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
