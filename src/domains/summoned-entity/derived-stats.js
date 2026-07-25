import { computeMonitorMax } from '@models/actor/derived-stats-helpers.js';

/**
 * @typedef {object} DerivedStatsResult
 * @property {import('@models/shared').SR4BaseDerivedStats} derivedStats
 * @property {{ physical: number, stun: number, matrix: number|undefined }|null} monitorMax
 * @property {{ INITIATIVE: number, MATRIXINITIATIVE: number, ASTRALINITIATIVE: number }|null} sheetStats
 */

/**
 * Pure: reads systemData but never mutates it. Callers are responsible for
 * applying monitorMax onto conditionMonitor and sheetStats onto sheetStats.
 * @param {object} systemData
 * @param {{ physical: number, astral: number, matrix: number, passesString: string }} initiative
 * @returns {DerivedStatsResult}
 */
function computeSummonedEntityStats(systemData, initiative) {
  const sheetStats = systemData.sheetStats;
  const monitor = systemData.conditionMonitor;

  if (!monitor?.physical || !monitor?.stun) {
    console.error('conditionMonitor missing or malformed:', monitor);
    return {
      derivedStats: { ...systemData.derivedStats },
      monitorMax: null,
      sheetStats: null,
    };
  }

  return {
    derivedStats: {
      ...systemData.derivedStats,
      woundModifier: 0,
      dicePoolModifier: systemData.modifiers.generalModifier,
      meleeDamageBonus: Math.ceil((sheetStats.STRENGTH ?? 0) / 2),
      initiative: {
        physical: initiative.physical,
        astral: initiative.astral,
        matrix: initiative.matrix,
      },
      passesString: initiative.passesString,
    },
    monitorMax: {
      physical: computeMonitorMax(sheetStats.BODY),
      stun: computeMonitorMax(sheetStats.WILLPOWER),
      matrix: monitor.matrix ? 0 : undefined,
    },
    sheetStats: {
      INITIATIVE: initiative.physical,
      ASTRALINITIATIVE: initiative.astral,
      MATRIXINITIATIVE: initiative.matrix,
    },
  };
}

/**
 * @param {object} systemData
 * @returns {DerivedStatsResult}
 */
export function computeSpiritDerivedStats(systemData) {
  const ss = systemData.sheetStats;
  return computeSummonedEntityStats(systemData, {
    physical: ss.INTUITION + ss.REACTION,
    astral: ss.INTUITION * 2,
    matrix: 0,
    passesString: '2/0/2',
  });
}

/**
 * @param {object} systemData
 * @returns {DerivedStatsResult}
 */
export function computeSpriteDerivedStats(systemData) {
  const ss = systemData.sheetStats;
  return computeSummonedEntityStats(systemData, {
    physical: ss.INTUITION + ss.REACTION,
    astral: 0,
    matrix: ss.INTUITION * 2,
    passesString: '2/2/0',
  });
}

/**
 * Pure: reads systemData but never mutates it. Callers are responsible for
 * applying monitorMax onto conditionMonitor.
 * @param {import('@models/index').SR4VehicleSystem} systemData
 * @returns {{ derivedStats: import('@models/index').SR4VehicleDerivedStats, monitorMax: { physical: number }|null, sheetStats: null }}
 */
export function computeVehicleDerivedStats(systemData) {
  const monitor = systemData.conditionMonitor;

  if (!monitor?.physical) {
    console.error('conditionMonitor missing or malformed:', monitor);
    return {
      derivedStats: { ...systemData.derivedStats },
      monitorMax: null,
      sheetStats: null,
    };
  }

  return {
    derivedStats: {
      ...systemData.derivedStats,
      woundModifier: 0,
      dicePoolModifier: systemData.modifiers.generalModifier,
      initiative: {
        physical: (systemData.pilot ?? 0) + (systemData.response ?? 0),
        astral: 0,
        matrix: 0,
      },
      passesString: '1/0/0',
    },
    monitorMax: {
      physical: computeMonitorMax(systemData.body),
    },
    sheetStats: null,
  };
}
