import {
  englishOr,
  normalizeMode,
  parseAmmo,
  parseDamage,
  parseNumber,
  sourceOf,
} from './helpers.js';
import { CATEGORY_TO_ATTACKSKILL, XML_CATEGORY_TO_ENUM } from './constants.js';

/**
 * @typedef {Record<string, string | string[]>} StatblockRecord
 */

/**
 * @typedef {object} MappedItem
 * @property {string} name
 * @property {string} type
 * @property {object} system
 */

/**
 * @param {string} [category]
 * @returns {string}
 */
function attackSkillFor(category) {
  return CATEGORY_TO_ATTACKSKILL[category ?? ''] ?? 'NONE';
}

/**
 * @param {StatblockRecord} record
 * @returns {MappedItem}
 */
export function mapMeleeWeapon(record) {
  const { damage, damageType, strengthBased } = parseDamage(
    /** @type {string} */ (record.damage)
  );
  const category = englishOr(record, 'category');
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Weapon',
    type: 'Melee Weapon',
    system: {
      damage,
      damageType,
      ap: parseNumber(record.ap, 0),
      attackSkill: attackSkillFor(category),
      category: XML_CATEGORY_TO_ENUM[category] ?? '',
      reach: parseNumber(record.reach, 0),
      noStrengthBonus: !strengthBased,
      source: sourceOf(record),
    },
  };
}

/**
 * @param {StatblockRecord} record
 * @returns {MappedItem}
 */
export function mapRangedWeapon(record) {
  const { damage, damageType } = parseDamage(
    /** @type {string} */ (record.damage)
  );
  const { capacity, feed } = parseAmmo(/** @type {string} */ (record.ammo));
  const category = englishOr(record, 'category');
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Weapon',
    type: 'Ranged Weapon',
    system: {
      damage,
      damageType,
      ap: parseNumber(record.ap, 0),
      attackSkill: attackSkillFor(category),
      category: XML_CATEGORY_TO_ENUM[category] ?? '',
      mode: normalizeMode(/** @type {string} */ (record.mode)),
      rc: parseNumber(record.rc, 0),
      maxAmmo: capacity,
      currentAmmo: capacity,
      ammoFeed: feed,
      smartlink: false,
      source: sourceOf(record),
    },
  };
}

/**
 * @param {StatblockRecord} record
 * @returns {MappedItem}
 */
export function mapWeapon(record) {
  const type = String(record.type ?? '').toLowerCase();
  return type === 'melee' ? mapMeleeWeapon(record) : mapRangedWeapon(record);
}
