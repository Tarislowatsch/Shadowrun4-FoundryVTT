/**
 * @fileoverview Import registry: ties each XML element name to its mapper,
 * type-label and subcategory resolvers.
 */

import {
  mapArmor,
  mapBioware,
  mapCritter,
  mapCritterVariant,
  mapCyberware,
  mapGear,
  mapMod,
  mapMetatype,
  mapMetavariant,
  mapPower,
  mapProgram,
  mapQuality,
  mapSkill,
  mapSpell,
  mapWeapon,
  mapWeaponMod,
  modKind,
  isAmmunition,
  isCommlink,
} from './mappers/index.js';

const MOD_TYPE_LABEL = {
  armor: 'Armor Mods',
  weapon: 'Weapon Mods',
  vehicle: 'Vehicle Mods',
};

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
const isMelee = (record) => String(record.type ?? '').toLowerCase() === 'melee';

/**
 * @param {string} fallback
 * @returns {(record: Record<string, unknown>) => string}
 */
function categoryOr(fallback) {
  return (record) => String(record.category ?? '').trim() || fallback;
}

/**
 * @typedef {object} TagConfig
 * @property {string} xmlTag
 * @property {(record: Record<string, unknown>) => { name: string, type: string, system: object }} map
 * @property {(record: Record<string, unknown>) => string} typeLabel
 * @property {(record: Record<string, unknown>) => string} subcategory
 * @property {string} [parentFolder]
 */

/** @type {TagConfig[]} */
export const TAG_CONFIGS = [
  {
    xmlTag: 'weapon',
    map: mapWeapon,
    typeLabel: (record) =>
      isMelee(record) ? 'Melee Weapons' : 'Ranged Weapons',
    subcategory: (record) =>
      String(record.category ?? '').trim() ||
      (isMelee(record) ? 'Melee Weapons' : 'Ranged Weapons'),
  },
  {
    xmlTag: 'armor',
    map: mapArmor,
    typeLabel: () => 'Armor',
    subcategory: categoryOr('Armor'),
  },
  {
    xmlTag: 'gear',
    map: mapGear,
    typeLabel: (record) =>
      isAmmunition(record)
        ? 'Ammunition'
        : isCommlink(record)
          ? 'Commlinks'
          : 'Gear',
    subcategory: (record) =>
      isAmmunition(record)
        ? 'Ammunition'
        : isCommlink(record)
          ? 'Commlink'
          : String(record.category ?? '').trim() || 'Gear',
  },
  {
    xmlTag: 'accessory',
    map: mapWeaponMod,
    typeLabel: () => 'Weapon Mods',
    subcategory: () => 'Weapon Accessories',
  },
  {
    xmlTag: 'mod',
    map: mapMod,
    typeLabel: (record) => MOD_TYPE_LABEL[modKind(record)],
    subcategory: (record) =>
      String(record.category ?? '').trim() || MOD_TYPE_LABEL[modKind(record)],
  },
  {
    xmlTag: 'cyberware',
    map: mapCyberware,
    typeLabel: () => 'Cyberware',
    subcategory: categoryOr('Cyberware'),
  },
  {
    xmlTag: 'bioware',
    map: mapBioware,
    typeLabel: () => 'Bioware',
    subcategory: categoryOr('Bioware'),
  },
  {
    xmlTag: 'spell',
    map: mapSpell,
    typeLabel: () => 'Spells',
    subcategory: categoryOr('Spells'),
  },
  {
    xmlTag: 'power',
    map: mapPower,
    typeLabel: () => 'Adept Powers',
    subcategory: categoryOr('Adept Powers'),
  },
  {
    xmlTag: 'program',
    map: mapProgram,
    typeLabel: () => 'Programs',
    subcategory: categoryOr('Programs'),
  },
  {
    xmlTag: 'quality',
    map: mapQuality,
    typeLabel: () => 'Qualities',
    subcategory: categoryOr('Qualities'),
  },
  {
    xmlTag: 'skill',
    map: mapSkill,
    typeLabel: () => 'Skills',
    subcategory: categoryOr('Skills'),
  },
  {
    xmlTag: 'metatype',
    map: (record) =>
      record._parentRecord
        ? mapMetavariant(record, record._parentRecord)
        : mapMetatype(record),
    typeLabel: (record) =>
      String(
        record._parentRecord
          ? (record._parentRecord.category ?? '')
          : (record.category ?? '')
      ).trim() || 'Metahuman',
    subcategory: (record) =>
      String(
        record._parentRecord
          ? (record._parentRecord.category ?? '')
          : (record.category ?? '')
      ).trim() || 'Metahuman',
    parentFolder: 'Metatypes',
  },
  {
    xmlTag: 'critter',
    map: (record) =>
      record._parentRecord
        ? mapCritterVariant(record, record._parentRecord)
        : mapCritter(record),
    typeLabel: (record) =>
      String(
        record._parentRecord
          ? (record._parentRecord.category ?? '')
          : (record.category ?? '')
      ).trim() || 'Critters',
    subcategory: (record) =>
      String(
        record._parentRecord
          ? (record._parentRecord.category ?? '')
          : (record.category ?? '')
      ).trim() || 'Critters',
    parentFolder: 'Critters',
  },
];
