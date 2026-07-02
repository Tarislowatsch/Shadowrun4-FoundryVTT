import { buildAffinityCategories } from './affinity-context.js';
import { getLinkedActors, buildStatRows } from './actor-context.js';

function buildSpiritStats(actor) {
  const sys = actor.system;
  const typeKey = `sr4.magic.spiritAffinities.${sys.spiritType}`;
  const typeLabel = sys.spiritType
    ? game.i18n.has(typeKey)
      ? game.i18n.localize(typeKey)
      : sys.spiritType
    : '';
  return buildStatRows([
    ['sr4.spirit.force', sys.force ?? 0],
    ['sr4.item.type', typeLabel],
    ['sr4.spirit.services', sys.services ?? 0],
  ]);
}

/**
 * @param {object} actorData
 * @param {string} ownerUuid
 */
export async function buildMagicContext(actorData, ownerUuid) {
  const sheetStats = actorData.system.sheetStats;
  const drainAttr = actorData.system.magic?.drainAttribute ?? 'LOGIC';
  const drainStatValue = sheetStats?.[drainAttr] ?? 0;
  return {
    drainStatValue,
    drainPool: (sheetStats?.WILLPOWER ?? 0) + drainStatValue,
    hasMagic: actorData.system.magic?.adept || actorData.system.magic?.magician,
    spiritAffinityCategories: await buildAffinityCategories(
      actorData.system.magic?.spiritAffinities,
      'sr4.magic.spiritAffinities',
      'spirit'
    ),
    summonedSpirits: getLinkedActors(
      ownerUuid,
      'spirit',
      'ownerUuid',
      buildSpiritStats
    ),
  };
}
