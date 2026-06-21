/**
 * @fileoverview Pure mapper turning quality statblock records into SR4 item data.
 */

import { parseNumber, sourceOf } from './helpers.js';

/**
 * @param {Record<string, string | string[]>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapQuality(record) {
  const category = String(record.qualitytype ?? record.category ?? '').trim();
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Quality',
    type: 'Quality',
    system: {
      category: category === 'Negative' ? 'Negative' : 'Positive',
      bp: parseNumber(record.bp, 0),
      limit: null,
      source: sourceOf(record),
    },
  };
}
