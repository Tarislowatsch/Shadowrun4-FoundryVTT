import { getGame } from '@utils/index';
import { AmmoCategory, SR4Attributes } from '@models/index';

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
 * @param {object[]} items
 * @returns {object[]}
 */
export function buildAmmoContext(items) {
  return items
    .filter((i) => i.type === 'Ammo')
    .map((a) => ({
      ...a,
      displayCategory: a.system.category
        ? (AmmoCategory[a.system.category] ?? a.system.category)
        : null,
    }));
}

/**
 * @param {Array<[string, string|number]>} pairs - [i18nKey, value] tuples
 * @returns {{label: string, value: string|number}[]}
 */
export function buildStatRows(pairs) {
  return pairs.map(([labelKey, value]) => ({
    label: game.i18n.localize(labelKey),
    value,
  }));
}

/**
 * @param {string} ownerUuid
 * @param {"spirit"|"sprite"|"vehicle"} type
 * @param {string} fieldName - "ownerUuid" or "riggerUuid"
 * @param {(actor: Actor) => {label: string, value: string|number}[]} buildStats
 * @returns {{uuid: string, img: string, name: string, stats: object[]}[]}
 */
export function getLinkedActors(ownerUuid, type, fieldName, buildStats) {
  if (!ownerUuid) return [];
  return game.actors
    .filter(
      (a) =>
        a.type === type &&
        a.system?.[fieldName] === ownerUuid &&
        a.testUserPermission(
          game.user,
          CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
        )
    )
    .map((a) => ({
      uuid: a.uuid,
      img: a.img,
      name: a.name,
      entityType: a.type,
      bound: a.system?.bound === true,
      stats: buildStats(a),
    }));
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
    rollableAttributes: Object.keys(SR4Attributes).filter(
      (key) =>
        key !== 'ESSENCE' && (actorData.system.sheetStats?.[key] ?? 0) > 0
    ),
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
