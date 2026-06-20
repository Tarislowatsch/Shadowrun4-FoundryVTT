import { postEdgeOffer } from '@utils/rolls/edge-offer-card.js';

/**
 * Posts a non-blocking Edge offer chat card. The flow continues immediately;
 * if the player clicks Edge on the card, `onResult` re-triggers the
 * remaining flow with the new success count.
 *
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ successes: number, rolledDice: number, isGlitch: boolean }} rollResult
 * @param {(newSuccesses: number) => Promise<void>} onResult
 * @returns {Promise<string>} the edge offer ChatMessage id
 */
export async function postEdgeRerollOffer(actor, rollResult, onResult) {
  return postEdgeOffer({
    actor,
    rollResult: {
      successes: rollResult.successes,
      rolledDice: rollResult.rolledDice,
      isGlitch: rollResult.isGlitch,
      isCriticalGlitch: false,
    },
    onReroll: onResult,
  });
}
