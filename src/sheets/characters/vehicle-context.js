import { getLinkedActors, buildStatRows } from './actor-context.js';

function buildVehicleStats(actor) {
  const sys = actor.system;
  return buildStatRows([
    ['sr4.item.type', sys.vehicleType || '-'],
    ['sr4.vehicle.handling', sys.effectiveHandling ?? 0],
    ['sr4.vehicle.speed', sys.effectiveSpeed ?? 0],
    ['sr4.vehicle.body', sys.effectiveBody ?? 0],
    ['sr4.vehicle.armor', sys.effectiveArmor ?? 0],
    ['sr4.vehicle.pilot', sys.effectivePilot ?? 0],
  ]);
}

/**
 * @param {string} ownerUuid
 * @returns {object[]}
 */
export function buildVehicleContext(ownerUuid) {
  return getLinkedActors(ownerUuid, 'vehicle', 'riggerUuid', buildVehicleStats);
}
