export function getGame() {
  if (!(game instanceof foundry.Game)) {
    throw new Error('Game is not initialized yet.');
  }
  return game;
}

const TARGETABLE_ACTOR_TYPES = Object.freeze([
  'character',
  'npc',
  'vehicle',
  'spirit',
]);

/**
 * @param {{ type?: string } | null | undefined} actor
 * @returns {boolean}
 */
export function isTargetableActor(actor) {
  return !!actor && TARGETABLE_ACTOR_TYPES.includes(actor.type ?? '');
}

/**
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidTargetActors() {
  return /** @type {import('@documents/index').SR4Actor[]} */ (
    [...(getGame().user?.targets ?? [])]
      .map((t) => t.actor)
      .filter(isTargetableActor)
  );
}

/**
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidMatrixTargetActors() {
  return /** @type {import('@documents/index').SR4Actor[]} */ (
    [...(getGame().user?.targets ?? [])]
      .map((t) => t.actor)
      .filter(
        (a) =>
          !!a &&
          (a.type === 'character' ||
            a.type === 'npc' ||
            a.type === 'device' ||
            a.type === 'sprite')
      )
  );
}

/**
 * @param {string} warnLabel used in the "no targets" warning message
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function getValidMatrixTargetActorsOrWarn(warnLabel) {
  const targets = getValidMatrixTargetActors();
  if (targets.length === 0) {
    ui?.notifications?.warn(
      `${warnLabel}: ${getGame().i18n?.localize('sr4.spell.noTargets')}`
    );
  }
  return targets;
}
