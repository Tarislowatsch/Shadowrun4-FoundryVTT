/**
 * @typedef {'single' | 'split' | 'area'} SpellTargetingMode
 */

/**
 * @typedef {object} SpellTargetHits
 * @property {import('@documents/index').SR4Actor} target
 * @property {number} hits
 */

/**
 * @param {import('@models/index').SR4Spell} spell
 * @param {import('@documents/index').SR4Actor} caster
 * @param {import('@documents/index').SR4Actor[]} markedTargets
 * @returns {import('@documents/index').SR4Actor[]}
 */
export function resolveSpellTargets(spell, caster, markedTargets) {
  if (spell.system?.range === 'SELF') return [caster];
  return markedTargets;
}

/**
 * @param {import('@models/index').SR4Spell} spell
 * @param {unknown[]} targets
 * @returns {SpellTargetingMode}
 */
export function resolveTargetingMode(spell, targets) {
  if (spell.system?.area) return 'area';
  return targets.length > 1 ? 'split' : 'single';
}

/**
 * @param {import('@documents/index').SR4Actor[]} targets
 * @param {number} hits
 * @returns {SpellTargetHits[]}
 */
export function sharedHits(targets, hits) {
  return targets.map((target) => ({ target, hits }));
}
