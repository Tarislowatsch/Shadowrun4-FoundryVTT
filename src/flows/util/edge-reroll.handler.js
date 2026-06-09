import { showEdgeDialog } from '@utils/rolls';

/**
 * Creates a ready-to-use `onReroll` callback for `ApplyDamageFlow.sendDecisionMessage`.
 * Centralises the `showEdgeDialog` call so individual flows don't need to import it.
 *
 * @param {SR4Actor} actor
 * @param {{ successes: number, rolledDice: number, isGlitch: boolean }} rollResult
 * @param {(newSuccesses: number) => Promise<void>} onResult - called with the new success count after edge is spent
 * @returns {() => Promise<void>}
 */
export function createEdgeRerollHandler(actor, rollResult, onResult) {
  return () =>
    showEdgeDialog({
      isCriticalGlitch: false,
      isGlitch: rollResult.isGlitch,
      successes: rollResult.successes,
      rolledDice: rollResult.rolledDice,
      actor,
      onCompleteWithResult: onResult,
    });
}
