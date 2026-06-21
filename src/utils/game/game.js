export function getGame() {
  if (!(game instanceof foundry.Game)) {
    throw new Error('Game is not initialized yet.');
  }
  return game;
}

/**
 * Returns the current user's targeted actors, filtered to characters and NPCs.
 *
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidTargetActors() {
  return /** @type {import('@documents/index').SR4Actor[]} */ (
    [...(getGame().user?.targets ?? [])]
      .map((t) => t.actor)
      .filter((a) => !!(a && (a.type === 'character' || a.type === 'npc')))
  );
}
