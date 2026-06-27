import { parseDecimal, sourceOf, upper } from './helpers.js';

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapPower(record) {
  const leveled = upper(record.levels) === 'YES';
  return {
    name: /** @type {string} */ (record.name) ?? 'Unnamed Power',
    type: 'Power',
    system: {
      cost: parseDecimal(record.points, 0),
      ratingMode: leveled ? 'rated' : 'none',
      rating: 1,
      geas: false,
      source: sourceOf(record),
    },
  };
}
