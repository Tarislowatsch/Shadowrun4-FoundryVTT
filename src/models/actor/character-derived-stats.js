import { SR4 } from '@config';
import { computeMonitorMax } from './derived-stats-helpers.js';
import {
  hasMatrixAccess,
  computeMatrixResponse,
  computeMatrixSystem,
  computeMatrixMonitorMax,
  matrixSimInitiativeBonus,
} from '@domains/matrix/derived-stats.js';
import { computeMagicSplit, computeRealmPasses } from '@domains/magic/split.js';

function computeWoundModifier(monitor, woundModBonus = 0) {
  const divisor = SR4.rules.woundModifierDivisor + woundModBonus;
  const physical = Math.floor((monitor.physical?.value ?? 0) / divisor);
  const stun = Math.floor((monitor.stun?.value ?? 0) / divisor);
  return -(physical + stun) || 0;
}

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} actorData
 * @param {import('@models/index').SR4SheetStats} sheetStats
 * @param {{ physical: number, matrix: number, astral: number }} initiativeBonus
 * @returns {{ physical: number, matrix: number, astral: number }}
 */
function computeInitiative(actorData, sheetStats, initiativeBonus) {
  const physical =
    sheetStats.INTUITION + sheetStats.REACTION + initiativeBonus.physical;

  const matrix = hasMatrixAccess(actorData)
    ? computeMatrixResponse(actorData) +
      sheetStats.INTUITION +
      initiativeBonus.matrix +
      matrixSimInitiativeBonus(actorData)
    : 0;

  const isMagician =
    actorData.magic?.magician === true && actorData.magic?.adept !== true;
  const astral = isMagician
    ? sheetStats.INTUITION * 2 + initiativeBonus.astral
    : 0;

  return { physical, matrix, astral };
}

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} actorData
 * @param {import('@models/index').SR4SheetStats} sheetStats
 * @param {import('@models/index').SR4ConditionMonitor} monitor
 * @returns {{ physical: number, stun: number, matrix: number|undefined }}
 */
function computeMonitorMaxResult(actorData, sheetStats, monitor) {
  return {
    physical: computeMonitorMax(sheetStats.BODY),
    stun: computeMonitorMax(sheetStats.WILLPOWER),
    matrix: monitor.matrix
      ? actorData.technomancy?.technomancer
        ? 0
        : computeMatrixMonitorMax(computeMatrixSystem(actorData))
      : undefined,
  };
}

/**
 * @typedef {object} DerivedStatsResult
 * @property {import('@models/index').SR4DerivedStats} derivedStats
 * @property {{ physical: number, stun: number, matrix: number|undefined }|null} monitorMax
 * @property {{ INITIATIVE: number, MATRIXINITIATIVE: number, ASTRALINITIATIVE: number }|null} sheetStats
 */

/**
 * Pure: reads actorData but never mutates it. Callers are responsible for
 * applying monitorMax onto conditionMonitor and sheetStats onto sheetStats.
 * @param {import('@models/index').SR4BaseCharacterSystem} actorData
 * @returns {DerivedStatsResult}
 */
export function computeDerivedStats(actorData) {
  const sheetStats = actorData.sheetStats;
  const modifiers = actorData.modifiers;
  const monitor = actorData.conditionMonitor;

  if (!monitor?.physical || !monitor?.stun) {
    console.error('conditionMonitor missing or malformed:', monitor);
    return {
      derivedStats: { ...actorData.derivedStats },
      monitorMax: null,
      sheetStats: null,
    };
  }

  const magicSplit = computeMagicSplit(actorData);
  const initiative = computeInitiative(
    actorData,
    sheetStats,
    modifiers.initiative.bonuses
  );
  const realmPasses = computeRealmPasses(actorData);
  const passesString = [
    realmPasses.physical,
    realmPasses.matrix,
    realmPasses.astral,
  ].join('/');
  const woundModifier = computeWoundModifier(monitor, modifiers.woundModBonus);

  return {
    derivedStats: {
      ...actorData.derivedStats,
      ...magicSplit,
      overflow: sheetStats.BODY + modifiers.overflowBonus,
      woundModifier,
      dicePoolModifier: woundModifier + modifiers.generalModifier,
      initiative,
      passesString,
      judgeIntentions: sheetStats.CHARISMA + sheetStats.WILLPOWER,
      liftCarry: sheetStats.STRENGTH + sheetStats.BODY,
      memory: sheetStats.LOGIC + sheetStats.INTUITION,
      composure: sheetStats.WILLPOWER + sheetStats.CHARISMA,
      meleeDamageBonus: Math.ceil(sheetStats.STRENGTH / 2),
    },
    monitorMax: computeMonitorMaxResult(actorData, sheetStats, monitor),
    sheetStats: {
      INITIATIVE: initiative.physical,
      MATRIXINITIATIVE: initiative.matrix,
      ASTRALINITIATIVE: initiative.astral,
    },
  };
}
