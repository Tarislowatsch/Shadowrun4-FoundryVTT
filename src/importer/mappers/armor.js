/**
 * @fileoverview Pure mapper turning armor statblock records into SR4 item data.
 */

import { commerceFields, parseNumber, sourceOf } from './helpers.js';

const ACCESSORY_CATEGORIES = new Set(['Helmets', 'Shields']);

/**
 * @param {Record<string, unknown>} record
 * @returns {'standard'|'accessory'|'formFitting'}
 */
function resolveStackingType(record) {
  const category = String(record.category ?? '').trim();
  if (ACCESSORY_CATEGORIES.has(category)) return 'accessory';
  const name = String(record.name ?? '');
  if (/form-fitting/i.test(name)) return 'formFitting';
  return 'standard';
}

/**
 * Maps an armor record to an "Armor" item.
 *
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapArmor(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Armor',
    type: 'Armor',
    system: {
      ballisticarmor: parseNumber(record.b, 0),
      impactarmor: parseNumber(record.i, 0),
      stackingType: resolveStackingType(record),
      capacity: parseNumber(record.armorcapacity, 0),
      ...commerceFields(record),
      source: sourceOf(record),
    },
  };
}
