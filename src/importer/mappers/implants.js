import {
  commerceFields,
  englishOr,
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
  const str = String(raw ?? '')
    .trim()
    .toLowerCase();
  return CHUMMER_GRADE_MAP[str] ?? 'STANDARD';
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
 * @param {Record<string, unknown>} record
 * @param {string} implantType
 * @returns {{ name: string, type: string, system: object }}
 */
function mapImplant(record, implantType) {
  const rating = parseNumber(record.rating, 0);
  const essence = resolveEssence(record.ess, rating);
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Implant',
    type: 'Implant',
    system: {
      essence,
      essenceActual: essence,
      capacity: parseNumber(record.capacity, 0),
      grade: normalizeGrade(englishOr(record, 'grade')),
      type: implantType,
      rating,
      ...commerceFields(record),
      source: sourceOf(record),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCyberware(record) {
  return mapImplant(record, 'CYBERWARE');
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapBioware(record) {
  return mapImplant(record, 'BIOWARE');
}
