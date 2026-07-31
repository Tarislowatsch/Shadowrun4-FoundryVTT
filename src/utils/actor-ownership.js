import { getGame } from './game/game.js';

/** @returns {boolean} */
export function isPrimaryGM() {
  const game = getGame();
  if (!game.user?.isGM) return false;
  const primaryGM = game.users?.find((u) => u.isGM && u.active);
  return game.user?.id === primaryGM?.id;
}

/**
 * @param {string} actorId
 * @returns {boolean}
 */
export function isResponsibleForActor(actorId) {
  const game = getGame();
  if (game.user?.character?.id === actorId) return true;
  const hasAssignedUser = game.users?.some(
    (u) => u.active && u.character?.id === actorId
  );
  if (hasAssignedUser) return false;
  if (!game.user?.isGM) return false;
  const primaryGM = game.users?.find((u) => u.isGM && u.active);
  return game.user?.id === primaryGM?.id;
}
