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
 * @param {{ spellpower: number, powerPoints: number }} [effectiveSplit]
 */
export async function buildMagicContext(actorData, ownerUuid, effectiveSplit) {
  const sheetStats = actorData.system.sheetStats;
  const magic = actorData.system.magic;
  const derived = actorData.system.derivedStats;
  const drainAttr = magic?.drainAttribute ?? 'LOGIC';
  const drainStatValue = sheetStats?.[drainAttr] ?? 0;
  const spellpower = derived?.spellpower ?? 0;
  const powerPointsMax = derived?.powerPoints ?? 0;
  const magicAllocated = spellpower + powerPointsMax;
  const effectiveSpellpower = effectiveSplit?.spellpower ?? spellpower;
  const effectivePowerPoints = effectiveSplit?.powerPoints ?? powerPointsMax;
  return {
    effectiveSpellpower,
    effectivePowerPoints,
    magicReduced:
      effectiveSpellpower !== spellpower ||
      effectivePowerPoints !== powerPointsMax,
    drainStatValue,
    drainPool: (sheetStats?.WILLPOWER ?? 0) + drainStatValue,
    hasMagic: magic?.adept || magic?.magician,
    isMysticAdept: magic?.adept === true && magic?.magician === true,
    spellpower,
    powerPointsMax,
    magicAllocated,
    magicUnallocated: Math.max((sheetStats?.MAGIC ?? 0) - magicAllocated, 0),
    overAllocated: derived?.magicOverAllocated === true,
    spiritAffinityCategories: await buildAffinityCategories(
      magic?.spiritAffinities,
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
