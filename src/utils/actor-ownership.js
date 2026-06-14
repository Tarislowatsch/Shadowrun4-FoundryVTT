import { getGame } from './game/game.js';

/** @returns {boolean} */
export function isPrimaryGM() {
  const game = getGame();
  if (!game.user?.isGM) return false;
  const primaryGM = game.users?.find((u) => u.isGM && u.active);
  return game.user?.id === primaryGM?.id;
}

/**
 * Returns true if the current user should handle a socket event for the given actor.
 * The actor's assigned player handles their own character; when nobody owns the actor,
 * only the first active GM takes responsibility — preventing double-handling when
 * multiple GMs are logged in.
 *
 * @param {string} actorId
 * @returns {boolean}
 */
export function isResponsibleForActor(actorId) {
  const game = getGame();
  if (game.user?.character?.id === actorId) return true;
  const hasAssignedUser = game.users?.some((u) => u.character?.id === actorId);
  if (hasAssignedUser) return false;
  if (!game.user?.isGM) return false;
  const primaryGM = game.users?.find((u) => u.isGM && u.active);
  return game.user?.id === primaryGM?.id;
}
