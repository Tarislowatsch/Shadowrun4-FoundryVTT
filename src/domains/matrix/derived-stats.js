import { SR4 } from '@config';
import { SimMode } from '@models/shared';

/**
 * Technomancers in full VR always run hot sim (SR4A p.239, living persona).
 * @param {object} system
 * @returns {'cold'|'hot'}
 */
export function effectiveSimMode(system) {
  if (system?.technomancy?.technomancer) return SimMode.HOT;
  return system?.matrixSimMode === SimMode.HOT ? SimMode.HOT : SimMode.COLD;
}

/**
 * @param {object} system
 * @returns {number}
 */
export function matrixSimPasses(system) {
  return effectiveSimMode(system) === SimMode.HOT
    ? SR4.rules.matrix.hotSimPasses
    : SR4.rules.matrix.coldSimPasses;
}

/**
 * @param {object} system
 * @returns {number}
 */
export function matrixSimInitiativeBonus(system) {
  return effectiveSimMode(system) === SimMode.HOT
    ? SR4.rules.matrix.hotSimInitiativeBonus
    : 0;
}

function capAtResonance(system, value) {
  return Math.min(value, system?.sheetStats?.RESONANCE ?? 0);
}

function bestEquippedCommlinkStat(items, key) {
  const values = items
    .filter((i) => i.type === 'Commlink' && i.system?.equipped)
    .map((i) => i.system?.[key] ?? 0);
  return values.length ? Math.max(...values) : 0;
}

/**
 * @param {object} system
 * @param {Array<{ type: string, system?: { equipped?: boolean } }>} [items]
 * @returns {boolean}
 */
export function hasMatrixAccess(system, items = system?.parent?.items ?? []) {
  return (
    system?.technomancy?.technomancer === true ||
    items.some((i) => i.type === 'Commlink' && i.system?.equipped)
  );
}

/**
 * Matrix Response used for VR initiative: living persona for technomancers,
 * otherwise the best equipped commlink.
 * @param {object} system
 * @param {Array<{ type: string, system?: { equipped?: boolean, response?: number } }>} [items]
 * @returns {number}
 */
export function computeMatrixResponse(
  system,
  items = system?.parent?.items ?? []
) {
  if (system?.technomancy?.technomancer) {
    return capAtResonance(
      system,
      (system.sheetStats?.INTUITION ?? 0) +
        (system.livingPersona?.responseBonus ?? 0)
    );
  }
  return bestEquippedCommlinkStat(items, 'response');
}

/**
 * @param {object} system
 * @param {Array<{ type: string, system?: { equipped?: boolean, os?: number } }>} [items]
 * @returns {number}
 */
export function computeMatrixSystem(
  system,
  items = system?.parent?.items ?? []
) {
  if (system?.technomancy?.technomancer) {
    return capAtResonance(
      system,
      (system.sheetStats?.LOGIC ?? 0) + (system.livingPersona?.systemBonus ?? 0)
    );
  }
  return bestEquippedCommlinkStat(items, 'os');
}

/**
 * @param {object} system
 * @param {Array<{ type: string, name?: string, system?: { equipped?: boolean, rating?: number, category?: string } }>} [items]
 * @returns {number}
 */
export function computeBiofeedbackFilter(
  system,
  items = system?.parent?.items ?? []
) {
  if (system?.technomancy?.technomancer) {
    return capAtResonance(
      system,
      (system.sheetStats?.CHARISMA ?? 0) +
        (system.livingPersona?.biofeedbackFilterBonus ?? 0)
    );
  }
  const filter = items.find(
    (i) =>
      i.type === 'Program' &&
      (i.system?.category === 'biofeedbackFilter' ||
        /biofeedback/i.test(i.name ?? ''))
  );
  return filter?.system?.rating ?? 0;
}

/**
 * @param {object} system
 * @param {Array<{ type: string, system?: { equipped?: boolean, firewall?: number } }>} [items]
 * @returns {number}
 */
export function computeMatrixFirewall(
  system,
  items = system?.parent?.items ?? []
) {
  if (system?.technomancy?.technomancer) {
    return capAtResonance(
      system,
      (system.sheetStats?.WILLPOWER ?? 0) +
        (system.livingPersona?.firewallBonus ?? 0)
    );
  }
  return bestEquippedCommlinkStat(items, 'firewall');
}

/**
 * @param {number} system - matrix System rating
 * @returns {number}
 */
export function computeMatrixMonitorMax(system) {
  return SR4.rules.conditionMonitorBase + Math.ceil((system ?? 0) / 2);
}
