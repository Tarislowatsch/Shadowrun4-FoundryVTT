import {
  parseNumber,
  formatSource,
  parseQualities,
  parseBonus,
  parsePowerList,
} from './helpers.js';
import { ATTRIBUTE_MAP } from './constants.js';

/**
 * @typedef {object} AttributeLimit
 * @property {number} min
 * @property {number} max
 * @property {number} aug
 */

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, AttributeLimit>}
 */
function parseAttributes(record) {
  /** @type {Record<string, AttributeLimit>} */
  const attrs = {};
  for (const [prefix, key] of ATTRIBUTE_MAP) {
    attrs[key] = {
      min: parseNumber(record[`${prefix}min`], 0),
      max: parseNumber(record[`${prefix}max`], 0),
      aug: parseNumber(record[`${prefix}aug`], 0),
    };
  }
  return attrs;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapMetatype(record) {
  const { reach, armorBallistic, armorImpact } = parseBonus(record);
  const qualities = parseQualities(record);

  return {
    name: String(record.name ?? '').trim() || 'Unnamed Metatype',
    type: 'Metatype',
    system: {
      category: String(record.category ?? '').trim() || 'Metahuman',
      bp: parseNumber(record.bp, 0),
      baseMetatype: '',
      attributes: parseAttributes(record),
      movement: String(record.movement ?? '').trim(),
      qualities,
      reach,
      armorBallistic,
      armorImpact,
      powers: parsePowerList(record, 'powers'),
      optionalPowers: parsePowerList(record, 'optionalpowers'),
      source: formatSource(
        /** @type {string} */ (record.source),
        /** @type {string} */ (record.page)
      ),
    },
  };
}

/**
 * @param {Record<string, unknown>} variant
 * @param {Record<string, unknown>} parent
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapMetavariant(variant, parent) {
  const base = mapMetatype(parent);
  const variantQualities = parseQualities(variant);
  const variantBonus = parseBonus(variant);
  const hasOwnBonus = variant.bonus && typeof variant.bonus === 'object';
  const variantPowers = parsePowerList(variant, 'powers');
  const variantOptPowers = parsePowerList(variant, 'optionalpowers');

  return {
    name: String(variant.name ?? '').trim() || 'Unnamed Metavariant',
    type: 'Metatype',
    system: {
      ...base.system,
      bp: parseNumber(variant.bp, base.system.bp),
      baseMetatype: base.name,
      qualities: {
        positive: variantQualities.positive.length
          ? variantQualities.positive
          : base.system.qualities.positive,
        negative: variantQualities.negative.length
          ? variantQualities.negative
          : base.system.qualities.negative,
      },
      reach: hasOwnBonus ? variantBonus.reach : base.system.reach,
      armorBallistic: hasOwnBonus
        ? variantBonus.armorBallistic
        : base.system.armorBallistic,
      armorImpact: hasOwnBonus
        ? variantBonus.armorImpact
        : base.system.armorImpact,
      powers: variantPowers.length ? variantPowers : base.system.powers,
      optionalPowers: variantOptPowers.length
        ? variantOptPowers
        : base.system.optionalPowers,
      source: formatSource(
        /** @type {string} */ (variant.source),
        /** @type {string} */ (variant.page)
      ),
    },
  };
}
