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

  derivedStats.augmentedMaximum = computeAugmentedMaximum(sheetStats);
  derivedStats.judgeIntentions = sheetStats.CHARISMA + sheetStats.WILLPOWER;
  derivedStats.liftCarry = sheetStats.STRENGTH + sheetStats.BODY;
  derivedStats.memory = sheetStats.LOGIC + sheetStats.INTUITION;
  derivedStats.composure = sheetStats.WILLPOWER + sheetStats.CHARISMA;

  return derivedStats;
}

/** @param {import('@models/index').SR4SheetStats} stats */
function computeAugmentedMaximum(stats) {
  return {
    BODY: Math.floor(stats.BODY / 2) + stats.BODY,
    STRENGTH: Math.floor(stats.STRENGTH / 2) + stats.STRENGTH,
    AGILITY: Math.floor(stats.AGILITY / 2) + stats.AGILITY,
    REACTION: Math.floor(stats.REACTION / 2) + stats.REACTION,
    WILLPOWER: Math.floor(stats.WILLPOWER / 2) + stats.WILLPOWER,
    LOGIC: Math.floor(stats.LOGIC / 2) + stats.LOGIC,
    INTUITION: Math.floor(stats.INTUITION / 2) + stats.INTUITION,
    CHARISMA: Math.floor(stats.CHARISMA / 2) + stats.CHARISMA,
    EDGE: Math.floor(stats.EDGE / 2) + stats.EDGE,
    MAGIC: Math.floor((stats.MAGIC || 1) / 2) + (stats.MAGIC || 0),
    RESONANCE: Math.floor((stats.RESONANCE || 1) / 2) + (stats.RESONANCE || 0),
    ESSENCE: stats.ESSENCE || 6,
    CURRENTEDGE: Math.floor(stats.EDGE / 2) + stats.EDGE,
    INITIATIVE: Math.floor((stats.INITIATIVE || 1) / 2),
    MATRIXINITIATIVE:
      Math.floor((stats.MATRIXINITIATIVE || 1) / 2) + stats.INITIATIVE,
    ASTRALINITIATIVE:
      Math.floor((stats.ASTRALINITIATIVE || 1) / 2) + stats.INITIATIVE,
  };
}

function getWoundModifier(monitor, woundMod) {
  return (
    computeWoundModifier(monitor.physical.current, woundMod ?? 0) +
    computeWoundModifier(monitor.stun.current, woundMod ?? 0)
  );
}

function computeWoundModifier(damage, woundModifier) {
  return Math.floor(damage / 3 + woundModifier);
}
