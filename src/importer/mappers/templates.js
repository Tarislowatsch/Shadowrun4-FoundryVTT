import {
  parseNumber,
  sourceOf,
  parseQualities,
  parseBonus,
  parsePowerList,
  mergeVariantOverBase,
} from './helpers.js';
import {
  critterActorType,
  ATTRIBUTE_MAP,
  FORCE_SPIRIT_CATEGORIES,
  FORCE_SPRITE_CATEGORIES,
} from './constants.js';
import { isForceFormula } from '@domains/magic/force-formula.js';

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
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} variant
 * @param {Record<string, unknown>} parent
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapMetavariant(variant, parent) {
  return mergeVariantOverBase(variant, parent, mapMetatype, {
    unnamedFallback: 'Unnamed Metavariant',
    baseNameField: 'baseMetatype',
  });
}

/**
 * @param {Record<string, unknown>} record
 * @param {boolean} forceBased
 * @returns {Record<string, { value: number, formula: string }>}
 */
function parseCritterAttributes(record, forceBased) {
  /** @type {Record<string, { value: number, formula: string }>} */
  const attrs = {};
  for (const [prefix, key] of ATTRIBUTE_MAP) {
    const raw = String(record[`${prefix}min`] ?? '').trim();
    if (forceBased && isForceFormula(raw)) {
      attrs[key] = { value: 0, formula: raw };
    } else {
      attrs[key] = { value: parseNumber(raw, 0), formula: '' };
    }
  }
  return attrs;
}

/**
 * @param {Record<string, unknown>} record
 * @param {boolean} forceBased
 * @returns {Array<{ name: string, rating: number, ratingFormula: string, spec: string }>}
 */
function parseSkills(record, forceBased) {
  const raw = record.skills;
  if (!raw || typeof raw !== 'object') return [];

  /** @type {unknown[]} */
  let list;
  if (Array.isArray(raw)) {
    list = raw;
  } else {
    const container = /** @type {Record<string, unknown>} */ (raw);
    list = ['skill', 'group'].flatMap((key) => {
      const value = container[key];
      if (value === undefined || value === null) return [];
      return Array.isArray(value) ? value : [value];
    });
  }

  const entries = [];
  for (const entry of list) {
    const el =
      typeof entry === 'object' && entry !== null
        ? /** @type {Record<string, unknown>} */ (entry)
        : null;
    const name = String(el ? (el['#text'] ?? '') : (entry ?? '')).trim();
    if (!name) continue;
    const rawRating = el ? String(el.rating ?? '0') : '0';
    const spec = el ? String(el.spec ?? '').trim() : '';

    if (forceBased && isForceFormula(rawRating)) {
      entries.push({ name, rating: 0, ratingFormula: rawRating, spec });
    } else {
      entries.push({
        name,
        rating: parseNumber(rawRating, 0),
        ratingFormula: '',
        spec,
      });
    }
  }
  return entries;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCritter(record) {
  const category = String(record.category ?? '').trim();
  const forceBased =
    FORCE_SPIRIT_CATEGORIES.has(category) ||
    FORCE_SPRITE_CATEGORIES.has(category);
  const actorType = critterActorType(category);
  const { reach, armorBallistic, armorImpact } = parseBonus(record);

  return {
    name: String(record.name ?? '').trim() || 'Unnamed Critter',
    type: 'CritterTemplate',
    system: {
      category,
      forceBased,
      actorType,
      bp: parseNumber(record.bp, 0),
      baseTemplate: '',
      attributes: parseCritterAttributes(record, forceBased),
      movement: String(record.movement ?? '').trim(),
      qualities: parseQualities(record),
      reach,
      armorBallistic,
      armorImpact,
      powers: parsePowerList(record, 'powers'),
      optionalPowers: parsePowerList(record, 'optionalpowers'),
      complexForms: parsePowerList(record, 'complexforms'),
      optionalComplexForms: parsePowerList(record, 'optionalcomplexforms'),
      skills: parseSkills(record, forceBased),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} variant
 * @param {Record<string, unknown>} parent
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCritterVariant(variant, parent) {
  return mergeVariantOverBase(variant, parent, mapCritter, {
    unnamedFallback: 'Unnamed Variant',
    baseNameField: 'baseTemplate',
    extraFields: (variantRecord, base) => {
      const forceBased = base.system.forceBased;
      const variantCFs = parsePowerList(variantRecord, 'complexforms');
      const variantOptCFs = parsePowerList(
        variantRecord,
        'optionalcomplexforms'
      );
      const variantSkills = parseSkills(variantRecord, forceBased);
      return {
        complexForms: variantCFs.length ? variantCFs : base.system.complexForms,
        optionalComplexForms: variantOptCFs.length
          ? variantOptCFs
          : base.system.optionalComplexForms,
        skills: variantSkills.length ? variantSkills : base.system.skills,
      };
    },
  });
}
