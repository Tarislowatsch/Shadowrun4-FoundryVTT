import { getGame } from '../game/game.js';
import { ControlModes } from './control-modes.js';

/**
 * Checks whether an actor is currently jumped into a vehicle/drone via Control Rig.
 * @param {import('@documents/index').SR4Actor} actor
 * @returns {boolean}
 */
export function isJumpedIn(actor) {
  if (!actor?.uuid) return false;
  return (
    getGame().actors?.some(
      (a) =>
        a.type === 'vehicle' &&
        a.system?.riggerUuid === actor.uuid &&
        a.system?.controlMode === ControlModes.JUMPED
    ) ?? false
  );
}
