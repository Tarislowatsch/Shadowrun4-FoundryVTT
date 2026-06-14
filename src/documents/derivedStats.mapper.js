import { SR4 } from '../config.js';

/**
 * @param {import('@models/index').SR4SpiritSystem} systemData
 * @returns {import('@models/index').SR4SpiritDerivedStats}
 */
export function computeSpiritDerivedStats(systemData) {
  const sheetStats = systemData.sheetStats;
  const monitor = systemData.conditionMonitor;
  const derivedStats = { ...systemData.derivedStats };

  monitor.physical.max = Math.ceil(
    SR4.rules.conditionMonitorBase + sheetStats.BODY / 2
  );
  monitor.stun.max = Math.ceil(
    SR4.rules.conditionMonitorBase + sheetStats.WILLPOWER / 2
  );

  derivedStats.woundModifier =
    Math.floor(monitor.physical.value / SR4.rules.woundModifierDivisor) +
    Math.floor(monitor.stun.value / SR4.rules.woundModifierDivisor);
  derivedStats.dicePoolModifier =
    derivedStats.woundModifier + systemData.modifiers.generalModifier;

  derivedStats.initiative.physical = sheetStats.INTUITION + sheetStats.REACTION;
  derivedStats.initiative.astral = sheetStats.INTUITION * 2;
  derivedStats.initiative.matrix = 0;

  // TODO: derive from spirit type table; 2 passes covers most common spirits
  derivedStats.passesString = '2/2/0';

  return derivedStats;
}

/**
 * @param {import('@models/index').SR4VehicleSystem} systemData
 * @returns {import('@models/index').SR4VehicleDerivedStats}
 */
export function computeVehicleDerivedStats(systemData) {
  const monitor = systemData.conditionMonitor;
  const derivedStats = { ...systemData.derivedStats };

  monitor.physical.max = Math.ceil(
    SR4.rules.conditionMonitorBase + systemData.body / 2
  );

  derivedStats.woundModifier = Math.floor(
    monitor.physical.value / SR4.rules.woundModifierDivisor
  );
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

  monitor.physical.max = Math.ceil(
    SR4.rules.conditionMonitorBase + sheetStats.BODY / 2
  );
  monitor.stun.max = Math.ceil(
    SR4.rules.conditionMonitorBase + sheetStats.WILLPOWER / 2
  );

  derivedStats.overflow = sheetStats.BODY + modifiers.overflowBonus;
  derivedStats.woundModifier = getWoundModifier(
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

  // derivedStats.augmentedMaximum = computeAugmentedMaximum(sheetStats);
  derivedStats.judgeIntentions = sheetStats.CHARISMA + sheetStats.WILLPOWER;
  derivedStats.liftCarry = sheetStats.STRENGTH + sheetStats.BODY;
  derivedStats.memory = sheetStats.LOGIC + sheetStats.INTUITION;
  derivedStats.composure = sheetStats.WILLPOWER + sheetStats.CHARISMA;

  return derivedStats;
}

// TODO: computeAugmentedMaximum — augmented maximums must be derived from the
// actor's metatype racial maximums, not just base * 1.5. Re-enable once metatype
// data is available on the actor.
// function computeAugmentedMaximum(stats) { ... }

/**
 * @param {import('@models/index').SR4ConditionMonitor} monitor
 * @param {number} woundMod
 * @returns {number}
 */
function getWoundModifier(monitor, woundMod) {
  const divisor = SR4.rules.woundModifierDivisor + (woundMod ?? 0);
  return (
    Math.floor(monitor.physical.value / divisor) +
    Math.floor(monitor.stun.value / divisor)
  );
}
