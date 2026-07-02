import { mapVehicle, mapVehicleModFromCharacter } from './mappers/vehicle.js';

/**
 * @param {Record<string, unknown>} record
 * @param {string} riggerUuid
 * @returns {{ name: string, type: 'vehicle', system: object, items: Array<object> }}
 */
export function buildVehicleActorData(record, riggerUuid) {
  const { name, system } = mapVehicle(record);
  const mods = /** @type {Array<Record<string, unknown>>} */ (
    record._mods ?? []
  );
  return {
    name,
    type: 'vehicle',
    system: { ...system, riggerUuid },
    items: mods.map(mapVehicleModFromCharacter),
  };
}
