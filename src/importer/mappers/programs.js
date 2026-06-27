import { commerceFields, parseNumber, sourceOf, upper } from './helpers.js';

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapProgram(record) {
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Program',
    type: 'Program',
    system: {
      ...commerceFields(record),
      rating: parseNumber(record.rating, 0),
      category: String(record.category ?? '').trim(),
      complexform: upper(record.complexform) === 'YES',
      maxrating: parseNumber(record.maxrating, 0) || null,
      source: sourceOf(record),
    },
  };
}
