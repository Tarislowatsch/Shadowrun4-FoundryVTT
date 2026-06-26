/**
 * @fileoverview Pure mappers turning cyberware/bioware statblock records into
 * SR4 "Implant" item data.
 */

import {
  commerceFields,
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
 * Maps an implant record to an "Implant" item of the given implant type.
 *
 * @param {Record<string, unknown>} record
 * @param {string} implantType - Enum key: 'CYBERWARE' or 'BIOWARE'.
 * @returns {{ name: string, type: string, system: object }}
 */
function mapImplant(record, implantType) {
  const essence = parseDecimal(record.ess, 0);
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Implant',
    type: 'Implant',
    system: {
      essence,
      essenceActual: essence,
      capacity: parseNumber(record.capacity, 0),
      grade: normalizeGrade(record.grade),
      type: implantType,
      rating: parseNumber(record.rating, 0),
      ...commerceFields(record),
      source: sourceOf(record),
    },
  };
}

/**
 * Maps a cyberware record to an "Implant" item.
 *
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapCyberware(record) {
  return mapImplant(record, 'CYBERWARE');
}

/**
 * Maps a bioware record to an "Implant" item.
 *
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapBioware(record) {
  return mapImplant(record, 'BIOWARE');
}
