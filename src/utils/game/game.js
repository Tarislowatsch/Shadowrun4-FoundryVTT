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

/**
 * @param {string} warnLabel used in the "no targets" warning message
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidTargetActorsOrWarn(warnLabel) {
  const targets = getValidTargetActors();
  if (targets.length === 0) {
    ui?.notifications?.warn(
      `${warnLabel}: ${getGame().i18n?.localize('sr4.spell.noTargets')}`
    );
  }
  return targets;
}
