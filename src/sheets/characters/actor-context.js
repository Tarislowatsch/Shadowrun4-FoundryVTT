import { getGame } from '@utils/index';

/**
 * @param {object[]} items
 * @returns {object[]}
 */
export function sortSkillsByLabel(items) {
  return items
    .filter((i) => i.type === 'Skill')
    .sort((a, b) => {
      const labelA = a.system.label
        ? getGame().i18n?.localize(a.system.label)
        : a.name;
      const labelB = b.system.label
        ? getGame().i18n?.localize(b.system.label)
        : b.name;
      return labelA.localeCompare(labelB);
    });
}

/**
 * @param {number} cyberEss
 * @param {number} bioEss
 * @returns {number}
 */
export function computeEssenceLoss(cyberEss, bioEss) {
  return cyberEss >= bioEss ? cyberEss + bioEss / 2 : cyberEss / 2 + bioEss;
}

/**
 * @param {object} actorData
 * @param {object} derivedStats
 * @param {object} [sourceStats]
 * @param {object} [sourceModifiers]
 */
export function buildComputedStats(
  actorData,
  derivedStats,
  sourceStats,
  sourceModifiers
) {
  const isMagician = actorData.system.magic?.magician === true;
  const srcBonuses = sourceModifiers?.initiative?.bonuses;
  const essenceLoss = computeEssenceLoss(
    derivedStats?.essenceLossCyber ?? 0,
    derivedStats?.essenceLossBio ?? 0
  );
  const baseEssence = actorData.system.sheetStats?.ESSENCE ?? 6;
  const currentEssence = Math.round((baseEssence - essenceLoss) * 100) / 100;

  return {
    computedStats: {
      ...actorData.system.sheetStats,
      ESSENCE: currentEssence,
      INITIATIVE: derivedStats?.initiative?.physical ?? 0,
      MATRIXINITIATIVE: derivedStats?.initiative?.matrix ?? 0,
      ASTRALINITIATIVE: derivedStats?.initiative?.astral ?? 0,
    },
    derivedKeys: [
      'ESSENCE',
      'INITIATIVE',
      'MATRIXINITIATIVE',
      'ASTRALINITIATIVE',
    ],
    derivedBaseValues: sourceStats
      ? {
          ESSENCE: currentEssence,
          INITIATIVE:
            (sourceStats.INTUITION ?? 0) +
            (sourceStats.REACTION ?? 0) +
            (srcBonuses?.physical ?? 0),
          MATRIXINITIATIVE:
            (sourceStats.INTUITION ?? 0) + (srcBonuses?.matrix ?? 0),
          ASTRALINITIATIVE: isMagician
            ? (sourceStats.INTUITION ?? 0) * 2 + (srcBonuses?.astral ?? 0)
            : 0,
        }
      : {},
    hasMetatypeLimits:
      Object.keys(derivedStats?.attributeMaximum ?? {}).length > 0,
    attributeMaximum: derivedStats?.attributeMaximum ?? {},
    augmentedMaximum: derivedStats?.augmentedMaximum ?? {},
    attributeMinimum: derivedStats?.attributeMinimum ?? {},
  };
}
