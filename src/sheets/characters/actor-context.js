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
 */
export function buildComputedStats(actorData, derivedStats) {
  return {
    computedStats: {
      ...actorData.system.sheetStats,
      INITIATIVE: derivedStats?.initiative?.physical ?? 0,
      MATRIXINITIATIVE: derivedStats?.initiative?.matrix ?? 0,
      ASTRALINITIATIVE: derivedStats?.initiative?.astral ?? 0,
    },
    derivedKeys: ['INITIATIVE', 'MATRIXINITIATIVE', 'ASTRALINITIATIVE'],
  };
}
