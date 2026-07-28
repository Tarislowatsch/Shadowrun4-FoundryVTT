import {
  GradeEssenceMultipliers,
  implantEssenceMultiplier,
} from '@models/index';
import {
  commerceFields,
  englishOr,
  lower,
  mappedName,
  parseDecimal,
  parseNumber,
  sourceOf,
} from './helpers.js';

/** @type {Record<string, string>} */
const CHUMMER_GRADE_MAP = {
  standard: 'STANDARD',
  alpha: 'ALPHA',
  beta: 'BETA',
  delta: 'DELTA',
  used: 'SECOND_HAND',
  'second-hand': 'SECOND_HAND',
  secondhand: 'SECOND_HAND',
};

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeGrade(raw) {
  const str = lower(raw).replace(/ware$/, '');
  return CHUMMER_GRADE_MAP[str] ?? 'STANDARD';
}

/**
 * @param {number} n
 * @returns {number}
 */
function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * @param {unknown} raw
 * @param {number} rating
 * @returns {number}
 */
function resolveEssence(raw, rating) {
  const str = String(raw ?? '')
    .replace(/,/g, '.')
    .trim();
  if (!str) return 0;
  if (/^\d*\.?\d+$/.test(str)) return parseDecimal(str, 0);
  const match =
    str.match(/^Rating\s*\*\s*(\d*\.?\d+)$/i) ??
    str.match(/^(\d*\.?\d+)\s*\*\s*Rating$/i);
  if (match)
    return Math.round((rating || 1) * parseFloat(match[1]) * 100) / 100;
  return 0;
}

/**
 * Chummer exports the final per-item essence (base × grade × quality). Reverse
 * the grade and character-quality multipliers so the stored base `essence`
 * feeds our own pipeline (which re-derives grade and re-applies the quality)
 * without double-counting.
 *
 * @param {Record<string, unknown>} record
 * @param {string} implantType
 * @param {{ biocompatibility?: string, sensitiveSystem?: boolean }} [essenceModifiers]
 * @returns {{ name: string, type: string, system: object }}
 */
function mapImplant(record, implantType, essenceModifiers = {}) {
  const rating = parseNumber(record.rating, 0);
  const grade = normalizeGrade(englishOr(record, 'grade'));
  const finalEssence = resolveEssence(record.ess, rating);
  const gradeMult = GradeEssenceMultipliers[grade] ?? 1;
  const qualityMult = implantEssenceMultiplier(implantType, essenceModifiers);
  const essence = round3(finalEssence / (gradeMult * qualityMult));
  return {
    name: mappedName(record, 'Unnamed Implant'),
    type: 'Implant',
    system: {
      essence,
      capacity: parseNumber(record.capacity, 0),
      grade,
      type: implantType,
      rating,
      ...commerceFields(record),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {*} [_translations]
 * @param {{ biocompatibility?: string, sensitiveSystem?: boolean }} [essenceModifiers]
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCyberware(record, _translations, essenceModifiers) {
  return mapImplant(record, 'CYBERWARE', essenceModifiers);
}

/**
 * @param {Record<string, unknown>} record
 * @param {*} [_translations]
 * @param {{ biocompatibility?: string, sensitiveSystem?: boolean }} [essenceModifiers]
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapBioware(record, _translations, essenceModifiers) {
  return mapImplant(record, 'BIOWARE', essenceModifiers);
}
