import { commerceFields, parseNumber, sourceOf } from './helpers.js';

/**
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapVehicle(record) {
  return {
    name: String(record.name ?? '').trim() || 'Unnamed Vehicle',
    type: 'vehicle',
    system: {
      vehicleType: String(record.category ?? '').trim(),
      body: parseNumber(record.body, 3),
      pilot: parseNumber(record.pilot, 1),
      response: parseNumber(record.response, 1),
      armor: parseNumber(record.armor, 0),
      sensor: parseNumber(record.sensor, 1),
      handling: parseNumber(record.handling, 3),
      speed: parseNumber(record.speed, 3),
      accel: parseNumber(record.accel, 2),
      cost: parseNumber(record.cost, 0),
      availability: String(record.avail ?? '').trim(),
      source: sourceOf(record),
    },
  };
}

/**
 * Character-export `<mod>` nodes carry no stat-bonus formulas (unlike the
 * compendium dump); handlingBonus/speedBonus/etc. are left at schema default.
 *
 * @param {Record<string, unknown>} record
 * @returns {{ name: string, type: string, system: object }}
 */
export function mapVehicleModFromCharacter(record) {
  return {
    name: String(record.name ?? '').trim() || 'Unnamed Vehicle Mod',
    type: 'Vehicle Mod',
    system: {
      ...commerceFields(record),
      rating: parseNumber(record.rating, 0),
      slotCost: parseNumber(record.slots, 1),
      source: sourceOf(record),
    },
  };
}
