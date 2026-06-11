/**
 * @param {import('@models/index').SR4SpiritSystem} systemData
 * @returns {import('@models/index').SR4SpiritDerivedStats}
 */
export function computeSpiritDerivedStats(systemData) {
  const sheetStats = systemData.sheetStats;
  const monitor = systemData.conditionMonitor;
  const derivedStats = { ...systemData.derivedStats };

  monitor.physical.max = Math.ceil(8 + sheetStats.BODY / 2);
  monitor.stun.max = Math.ceil(8 + sheetStats.WILLPOWER / 2);

  derivedStats.woundModifier =
    Math.floor(monitor.physical.current / 3) +
    Math.floor(monitor.stun.current / 3);
  derivedStats.dicePoolModifier = derivedStats.woundModifier;

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

  monitor.physical.max = Math.ceil(8 + systemData.body / 2);

  derivedStats.woundModifier = Math.floor(monitor.physical.current / 3);
  derivedStats.dicePoolModifier = derivedStats.woundModifier;

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

  monitor.physical.max = Math.ceil(8 + sheetStats.BODY / 2);
  monitor.stun.max = Math.ceil(8 + sheetStats.WILLPOWER / 2);

  derivedStats.overflow = sheetStats.BODY + modifiers.overflowBonus;
  derivedStats.woundModifier = getWoundModifier(
    monitor,
    modifiers.woundModBonus
  );
  derivedStats.dicePoolModifier =
    derivedStats.woundModifier + modifiers.generalModifier;

  initiative.physical =
    sheetStats.INTUITION + sheetStats.REACTION + initiativeBonus.physical;
  initiative.astral = sheetStats.INTUITION * 2 + initiativeBonus.astral;
  initiative.matrix = sheetStats.INTUITION + initiativeBonus.matrix;

  derivedStats.passesString = [
    initiativePasses.physical,
    initiativePasses.astral,
    initiativePasses.matrix,
  ].join('/');

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
  return (
    computeWoundModifier(monitor.physical.current, woundMod ?? 0) +
    computeWoundModifier(monitor.stun.current, woundMod ?? 0)
  );
}

/**
 * @param {number} damage
 * @param {number} woundModifier
 * @returns {number}
 */
function computeWoundModifier(damage, woundModifier) {
  return Math.floor(damage / 3 + woundModifier);
}
