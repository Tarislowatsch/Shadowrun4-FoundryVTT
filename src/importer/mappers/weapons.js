import {
  englishOr,
  mappedName,
  normalizeMode,
  parseAmmo,
  parseDamage,
  parseNumber,
  sourceOf,
} from './helpers.js';
import {
  CATEGORY_TO_ATTACKSKILL,
  CATEGORY_TO_DAMAGETYPE,
  XML_CATEGORY_TO_ENUM,
  dt,
} from './constants.js';

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
 * Ein expliziter Element-Suffix im Schadensstring (z. B. "(e)") gewinnt.
 * Nur bei PHYSICAL/STUN greift das Mapping über die Kategorie.
 *
 * @param {string} category
 * @param {string} parsedType
 * @returns {string}
 */
function resolveDamageType(category, parsedType) {
  if (parsedType !== dt.PHYSICAL && parsedType !== dt.STUN) return parsedType;
  return CATEGORY_TO_DAMAGETYPE[category] ?? parsedType;
}

/**
 * @param {StatblockRecord} record
 * @returns {MappedItem}
 */
export function mapMeleeWeapon(record) {
  const category = englishOr(record, 'category');
  const parsed = parseDamage(/** @type {string} */ (record.damage));
  return {
    name: mappedName(record, 'Unnamed Weapon'),
    type: 'Melee Weapon',
    system: {
      damage: parsed.damage,
      damageType: resolveDamageType(category, parsed.damageType),
      ap: parseNumber(record.ap, 0),
      attackSkill: attackSkillFor(category),
      category: XML_CATEGORY_TO_ENUM[category] ?? '',
      reach: parseNumber(record.reach, 0),
      noStrengthBonus: !parsed.strengthBased,
      source: sourceOf(record),
    },
  };
}

/**
 * @param {StatblockRecord} record
 * @returns {MappedItem}
 */
export function mapRangedWeapon(record) {
  const category = englishOr(record, 'category');
  const parsed = parseDamage(/** @type {string} */ (record.damage));
  const { capacity, feed } = parseAmmo(/** @type {string} */ (record.ammo));
  return {
    name: mappedName(record, 'Unnamed Weapon'),
    type: 'Ranged Weapon',
    system: {
      damage: parsed.damage,
      damageType: resolveDamageType(category, parsed.damageType),
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
