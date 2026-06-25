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
    passesString: '2/2/0',
  });
}

export function computeSpriteDerivedStats(systemData) {
  const ss = systemData.sheetStats;
  return computeSummonedEntityStats(systemData, {
    physical: ss.INTUITION + ss.REACTION,
    astral: 0,
    matrix: ss.INTUITION * 2,
    passesString: '2/0/2',
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
 * @param {import('@models/index').SR4BaseCharacterSystem} actorData
 * @returns {import('@models/index').SR4DerivedStats}
 */
export function computeDerivedStats(actorData) {
  const sheetStats = actorData.sheetStats;
  const modifiers = actorData.modifiers;
  const derivedStats = { ...actorData.derivedStats };
  const initiativePasses = modifiers.initiative.passes;
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
  initiative.matrix = sheetStats.INTUITION + initiativeBonus.matrix;

  const isMagician = actorData.magic?.magician === true;
  initiative.astral = isMagician
    ? sheetStats.INTUITION * 2 + initiativeBonus.astral
    : 0;

  derivedStats.passesString = [
    1 + initiativePasses.physical,
    isMagician ? 1 + initiativePasses.astral : 0,
    initiativePasses.matrix,
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
