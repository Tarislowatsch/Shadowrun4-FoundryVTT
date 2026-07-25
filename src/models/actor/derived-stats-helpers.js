import { SR4 } from '@config';

/**
 * @param {number} stat
 * @returns {number}
 */
export function computeMonitorMax(stat) {
  return Math.ceil(SR4.rules.conditionMonitorBase + stat / 2);
}

/**
 * @param {{ physical?: object, stun?: object, matrix?: object }} conditionMonitor
 * @param {{ physical?: number, stun?: number, matrix?: number }|null} monitorMax
 */
function applyMonitorMax(conditionMonitor, monitorMax) {
  if (!monitorMax) return;
  if (conditionMonitor.physical && monitorMax.physical !== undefined) {
    conditionMonitor.physical.max = monitorMax.physical;
  }
  if (conditionMonitor.stun && monitorMax.stun !== undefined) {
    conditionMonitor.stun.max = monitorMax.stun;
  }
  if (conditionMonitor.matrix && monitorMax.matrix !== undefined) {
    conditionMonitor.matrix.max = monitorMax.matrix;
  }
}

/**
 * Applies a pure derived-stats mapper's result onto a live TypeDataModel
 * instance: merges `derivedStats`, writes `monitorMax` onto
 * `self.conditionMonitor`, and merges `sheetStats` if present.
 * @param {{ derivedStats: object, conditionMonitor: object, sheetStats?: object }} self
 * @param {{ derivedStats: object, monitorMax: object|null, sheetStats?: object|null }} result
 */
export function applyDerivedStatsResult(
  self,
  { derivedStats, monitorMax, sheetStats }
) {
  Object.assign(self.derivedStats, derivedStats);
  applyMonitorMax(self.conditionMonitor, monitorMax);
  if (sheetStats) Object.assign(self.sheetStats, sheetStats);
}
