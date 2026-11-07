// @ts-nocheck

const FLAG_SCOPE = 'shadowrun4e';
const FLAG_KEY = 'sceneModifiers';

/**
 * @typedef {{ backgroundCount: number, backgroundCountTradition: string, mysticAdeptReduction: string, light: string, obscurant: string }} SceneModifiers
 */

/** @type {SceneModifiers} */
const DEFAULTS = {
  backgroundCount: 0,
  backgroundCountTradition: '',
  mysticAdeptReduction: 'spellpower',
  light: 'normal',
  obscurant: 'none',
};

/**
 * @param {object} [scene]
 * @returns {SceneModifiers}
 */
export function getSceneModifiers(scene) {
  const stored = scene?.getFlag?.(FLAG_SCOPE, FLAG_KEY) ?? {};
  return { ...DEFAULTS, ...stored };
}

/**
 * @param {object} [scene]
 * @returns {number}
 */
export function getBackgroundCount(scene) {
  return getSceneModifiers(scene).backgroundCount ?? 0;
}

/**
 * @param {object} [scene]
 * @returns {{ light: string, obscurant: string }}
 */
export function getSceneVisibility(scene) {
  const { light, obscurant } = getSceneModifiers(scene);
  return { light, obscurant };
}

/**
 * @param {object} scene
 * @param {Partial<SceneModifiers>} data
 * @returns {Promise<object>}
 */
export function setSceneModifiers(scene, data) {
  const current = getSceneModifiers(scene);
  return scene.setFlag(FLAG_SCOPE, FLAG_KEY, { ...current, ...data });
}

/**
 * Signed Background Count modifier for Magic: positive = penalty (reduce Magic /
 * raise Drain target), negative = bonus when the count is aspected to the
 * actor's own tradition (SR4 Aspect rule).
 * @param {object} [scene]
 * @param {string} [actorTradition]
 * @returns {number}
 */
export function getBackgroundCountMagicModifier(scene, actorTradition) {
  const magnitude = Math.abs(getBackgroundCount(scene));
  if (magnitude === 0) return 0;
  const aspect = getSceneModifiers(scene).backgroundCountTradition;
  if (aspect && actorTradition && aspect === actorTradition) return -magnitude;
  return magnitude;
}

/**
 * SM p. 118: for mystic adepts the gamemaster decides whether the Background
 * Count deducts from magician abilities or adept powers first.
 * @param {object} [scene]
 * @returns {'spellpower' | 'powerPoints'}
 */
export function getMysticAdeptReduction(scene) {
  return getSceneModifiers(scene).mysticAdeptReduction === 'powerPoints'
    ? 'powerPoints'
    : 'spellpower';
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {object} [scene]
 * @returns {number}
 */
export function getEffectiveDrainModifier(actor, scene = canvas?.scene) {
  return getBackgroundCountMagicModifier(scene, actor.getMagicTradition());
}
