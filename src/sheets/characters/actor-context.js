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

  return {
    computedStats: {
      ...actorData.system.sheetStats,
      INITIATIVE: derivedStats?.initiative?.physical ?? 0,
      MATRIXINITIATIVE: derivedStats?.initiative?.matrix ?? 0,
      ASTRALINITIATIVE: derivedStats?.initiative?.astral ?? 0,
    },
    derivedKeys: ['INITIATIVE', 'MATRIXINITIATIVE', 'ASTRALINITIATIVE'],
    derivedBaseValues: sourceStats
      ? {
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
