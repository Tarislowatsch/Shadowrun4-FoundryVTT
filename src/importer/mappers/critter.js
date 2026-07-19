import {
  parseNumber,
  formatSource,
  parseQualities,
  parseBonus,
  parsePowerList,
} from './helpers.js';
import {
  critterActorType,
  ATTRIBUTE_MAP,
  FORCE_SPIRIT_CATEGORIES,
  FORCE_SPRITE_CATEGORIES,
} from './constants.js';
import { isForceFormula } from '@utils/force-formula.js';

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
export function mapCritterVariant(variant, parent) {
  const base = mapCritter(parent);
  const forceBased = base.system.forceBased;
  const variantQualities = parseQualities(variant);
  const variantBonus = parseBonus(variant);
  const hasOwnBonus = variant.bonus && typeof variant.bonus === 'object';
  const variantPowers = parsePowerList(variant, 'powers');
  const variantOptPowers = parsePowerList(variant, 'optionalpowers');
  const variantCFs = parsePowerList(variant, 'complexforms');
  const variantOptCFs = parsePowerList(variant, 'optionalcomplexforms');
  const variantSkills = parseSkills(variant, forceBased);

  return {
    name: String(variant.name ?? '').trim() || 'Unnamed Variant',
    type: 'CritterTemplate',
    system: {
      ...base.system,
      bp: parseNumber(variant.bp, base.system.bp),
      baseTemplate: base.name,
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
      complexForms: variantCFs.length ? variantCFs : base.system.complexForms,
      optionalComplexForms: variantOptCFs.length
        ? variantOptCFs
        : base.system.optionalComplexForms,
      skills: variantSkills.length ? variantSkills : base.system.skills,
      source: formatSource(
        /** @type {string} */ (variant.source),
        /** @type {string} */ (variant.page)
      ),
    },
  };
}
