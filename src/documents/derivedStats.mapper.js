import { SR4 } from '../config.js';

function computeMonitorMax(stat) {
  return Math.ceil(SR4.rules.conditionMonitorBase + stat / 2);
}

function computeWoundModifier(monitor, woundModBonus = 0) {
  const divisor = SR4.rules.woundModifierDivisor + woundModBonus;
  const physical = Math.floor((monitor.physical?.value ?? 0) / divisor);
  const stun = Math.floor((monitor.stun?.value ?? 0) / divisor);
  return -(physical + stun) || 0;
}

/**
 * @param {object} system
 * @returns {number}
 */
export function matrixSimPasses(system) {
  return system?.matrixSimMode === 'hot'
    ? SR4.rules.matrix.hotSimPasses
    : SR4.rules.matrix.coldSimPasses;
}

/**
 * @param {object} system
 * @returns {number}
 */
export function matrixSimInitiativeBonus(system) {
  return system?.matrixSimMode === 'hot'
    ? SR4.rules.matrix.hotSimInitiativeBonus
    : 0;
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
    return (
      (system.sheetStats?.INTUITION ?? 0) +
      (system.livingPersona?.responseBonus ?? 0)
    );
  }
  const responses = items
    .filter((i) => i.type === 'Commlink' && i.system?.equipped)
    .map((i) => i.system?.response ?? 0);
  return responses.length ? Math.max(...responses) : 0;
}

/**
 * @param {object} systemData
 * @param {{ physical: number, astral: number, matrix: number, passesString: string }} initiative
 * @returns {object}
 */
function computeSummonedEntityStats(systemData, initiative) {
  const sheetStats = systemData.sheetStats;
  const monitor = systemData.conditionMonitor;
  const derivedStats = { ...systemData.derivedStats };

  monitor.physical.max = computeMonitorMax(sheetStats.BODY);
  monitor.stun.max = computeMonitorMax(sheetStats.WILLPOWER);

  derivedStats.woundModifier = computeWoundModifier(monitor);
  derivedStats.dicePoolModifier =
    derivedStats.woundModifier + systemData.modifiers.generalModifier;
  derivedStats.meleeDamageBonus = Math.ceil((sheetStats.STRENGTH ?? 0) / 2);

  derivedStats.initiative.physical = initiative.physical;
  derivedStats.initiative.astral = initiative.astral;
  derivedStats.initiative.matrix = initiative.matrix;
  derivedStats.passesString = initiative.passesString;

  sheetStats.INITIATIVE = initiative.physical;
  sheetStats.ASTRALINITIATIVE = initiative.astral;
  sheetStats.MATRIXINITIATIVE = initiative.matrix;

  return derivedStats;
}

export function computeSpiritDerivedStats(systemData) {
  const ss = systemData.sheetStats;
  return computeSummonedEntityStats(systemData, {
    physical: ss.INTUITION + ss.REACTION,
    astral: ss.INTUITION * 2,
    matrix: 0,
    passesString: '2/0/2',
  });
}

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
 * @param {import('@models/index').SR4VehicleSystem} systemData
 * @returns {import('@models/index').SR4VehicleDerivedStats}
 */
export function computeVehicleDerivedStats(systemData) {
  const monitor = systemData.conditionMonitor;
  const derivedStats = { ...systemData.derivedStats };

  monitor.physical.max = computeMonitorMax(systemData.body);

  derivedStats.woundModifier = computeWoundModifier(monitor);
  derivedStats.dicePoolModifier =
    derivedStats.woundModifier + systemData.modifiers.generalModifier;

  derivedStats.initiative.physical =
    (systemData.pilot ?? 0) + (systemData.response ?? 0);
  derivedStats.initiative.astral = 0;
  derivedStats.initiative.matrix = 0;
  derivedStats.passesString = '1/0/0';

  return derivedStats;
}

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} system
 * @returns {{ physical: number, astral: number, matrix: number }}
 */
export function computeRealmPasses(system) {
  const passes = system?.modifiers?.initiative?.passes;
  const magic = system?.magic;
  const canProject = magic?.magician === true && magic?.adept !== true;
  return {
    physical: 1 + (passes?.physical ?? 0),
    astral: canProject ? 3 + (passes?.astral ?? 0) : 0,
    matrix: hasMatrixAccess(system)
      ? matrixSimPasses(system) + (passes?.matrix ?? 0)
      : 0,
  };
}

/**
 * @param {import('@models/index').SR4BaseCharacterSystem} actorData
 * @returns {import('@models/index').SR4DerivedStats}
 */
export function computeDerivedStats(actorData) {
  const sheetStats = actorData.sheetStats;
  const modifiers = actorData.modifiers;
  const derivedStats = { ...actorData.derivedStats };
  const initiativeBonus = modifiers.initiative.bonuses;
  const initiative = derivedStats.initiative;
  const monitor = actorData.conditionMonitor;

  if (!monitor?.physical || !monitor?.stun) {
    console.error('conditionMonitor missing or malformed:', monitor);
    return derivedStats;
  }

  monitor.physical.max = computeMonitorMax(sheetStats.BODY);
  monitor.stun.max = computeMonitorMax(sheetStats.WILLPOWER);

  derivedStats.overflow = sheetStats.BODY + modifiers.overflowBonus;
  derivedStats.woundModifier = computeWoundModifier(
    monitor,
    modifiers.woundModBonus
  );
  derivedStats.dicePoolModifier =
    derivedStats.woundModifier + modifiers.generalModifier;

  initiative.physical =
    sheetStats.INTUITION + sheetStats.REACTION + initiativeBonus.physical;

  initiative.matrix = hasMatrixAccess(actorData)
    ? computeMatrixResponse(actorData) +
      sheetStats.INTUITION +
      initiativeBonus.matrix +
      matrixSimInitiativeBonus(actorData)
    : 0;

  const isMagician =
    actorData.magic?.magician === true && actorData.magic?.adept !== true;
  initiative.astral = isMagician
    ? sheetStats.INTUITION * 2 + initiativeBonus.astral
    : 0;

  const realmPasses = computeRealmPasses(actorData);
  derivedStats.passesString = [
    realmPasses.physical,
    realmPasses.matrix,
    realmPasses.astral,
  ].join('/');

  sheetStats.INITIATIVE = initiative.physical;
  sheetStats.MATRIXINITIATIVE = initiative.matrix;
  sheetStats.ASTRALINITIATIVE = initiative.astral;

  derivedStats.judgeIntentions = sheetStats.CHARISMA + sheetStats.WILLPOWER;
  derivedStats.liftCarry = sheetStats.STRENGTH + sheetStats.BODY;
  derivedStats.memory = sheetStats.LOGIC + sheetStats.INTUITION;
  derivedStats.composure = sheetStats.WILLPOWER + sheetStats.CHARISMA;
  derivedStats.meleeDamageBonus = Math.ceil(sheetStats.STRENGTH / 2);

  return derivedStats;
}
