import {
  commerceFields,
  englishOr,
  parseNumber,
  sourceOf,
  upper,
} from './helpers.js';
import { mapProgram } from './programs.js';
import { isAmmunition, mapAmmo } from './ammo.js';

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isFocus(record) {
  return englishOr(record, 'category') === 'Foci';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isFetish(record) {
  return englishOr(record, 'category') === 'Fetishes';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isCommlink(record) {
  return upper(record.iscommlink) === 'TRUE';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function isProgram(record) {
  return upper(record.isprogram) === 'TRUE' || upper(record.isos) === 'TRUE';
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ cost: number, avail: number, availability: string, rating: number, quantity: number, source: string }}
 */
function gearBase(record) {
  return {
    ...commerceFields(record),
    rating: parseNumber(record.rating, 0),
    quantity: parseNumber(record.qty, 0),
    source: sourceOf(record),
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
function mapCommlinkGear(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Commlink',
    type: 'Commlink',
    system: {
      ...gearBase(record),
      response: parseNumber(record.response, 1),
      signal: parseNumber(record.signal, 1),
      firewall: parseNumber(record.firewall, 1),
      os: parseNumber(record.system, 1),
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
function mapFocusGear(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Focus',
    type: 'Focus',
    system: {
      ...gearBase(record),
      equipped: upper(record.equipped) === 'TRUE',
    },
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
function mapFetishGear(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Fetish',
    type: 'Fetish',
    system: gearBase(record),
  };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
function mapDefaultGear(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Item',
    type: 'Item',
    system: gearBase(record),
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Map<string, string>} [weaponCategoryTranslations]
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapGear(record, weaponCategoryTranslations) {
  if (isAmmunition(record)) return mapAmmo(record, weaponCategoryTranslations);
  if (isCommlink(record)) return mapCommlinkGear(record);
  if (isProgram(record)) return mapProgram(record);
  if (isFocus(record)) return mapFocusGear(record);
  if (isFetish(record)) return mapFetishGear(record);
  return mapDefaultGear(record);
}
