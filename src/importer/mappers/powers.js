import { isYes, mappedName, parseDecimal, sourceOf } from './helpers.js';

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapPower(record) {
  const leveled = isYes(record.levels);
  return {
    name: mappedName(record, 'Unnamed Power'),
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
