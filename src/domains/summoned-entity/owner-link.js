import { ControlModes } from '@domains/rigging/control-modes.js';

export const OWNER_LINK_FIELDS = Object.freeze({
  spirit: 'ownerUuid',
  sprite: 'ownerUuid',
  vehicle: 'riggerUuid',
});

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {Promise<unknown>}
 */
export function unlinkFromOwner(actor) {
  if (actor.type === 'vehicle') {
    return actor.update({
      'system.riggerUuid': '',
      'system.controlMode': ControlModes.AUTONOMOUS,
    });
  }
  return actor.update({ 'system.ownerUuid': '', 'system.bound': false });
}

/**
 * @param {string} ownerUuid
 * @param {Iterable<import('@documents/index').SR4Actor>} [actors]
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function findLinkedActors(ownerUuid, actors = game.actors) {
  if (!ownerUuid) return [];
  return [...actors].filter((a) => {
    const fieldName = OWNER_LINK_FIELDS[a.type];
    return fieldName !== undefined && a.system?.[fieldName] === ownerUuid;
  });
}
