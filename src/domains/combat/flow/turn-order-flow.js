import { getPassCount, combatantPasses } from '../initiative.js';

/**
 * Locks each combatant's pass count for the current round onto a flag, so
 * later passes see a stable snapshot even if derived stats change mid-round.
 * @param {import('@documents/index').SR4Combat} combat
 * @returns {Promise<void>}
 */
export async function refreshPassLocks(combat) {
  const updates = combat.combatants.map((c) => ({
    _id: c.id,
    'flags.shadowrun4e.passLock': getPassCount(c),
  }));
  if (updates.length)
    await combat.updateEmbeddedDocuments('Combatant', updates);
}

/**
 * Advances to the next combatant eligible for the current initiative pass,
 * or opens the next pass, or rolls over to the next round.
 * @param {import('@documents/index').SR4Combat} combat
 * @returns {Promise<import('@documents/index').SR4Combat>}
 */
export async function advanceTurn(combat) {
  const pass = combat.initiativePass;
  const turns = combat.turns;
  const currentTurn = combat.turn ?? -1;

  const nextIdx = turns.findIndex(
    (c, i) => i > currentTurn && combatantPasses(c) >= pass
  );
  if (nextIdx !== -1) {
    return combat.update({ turn: nextIdx });
  }

  const nextPass = pass + 1;
  const firstInNextPass = turns.findIndex(
    (c) => combatantPasses(c) >= nextPass
  );
  if (firstInNextPass !== -1) {
    return combat.update({
      turn: firstInNextPass,
      [`flags.shadowrun4e.initiativePass`]: nextPass,
    });
  }

  return combat.nextRound();
}
