export function getGame() {
  if (!(game instanceof foundry.Game)) {
    throw new Error('Game is not initialized yet.');
  }
  return game;
}

/**
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidTargetActors() {
  return /** @type {import('@documents/index').SR4Actor[]} */ (
    [...(getGame().user?.targets ?? [])]
      .map((t) => t.actor)
      .filter((a) => !!(a && (a.type === 'character' || a.type === 'npc')))
  );
}
