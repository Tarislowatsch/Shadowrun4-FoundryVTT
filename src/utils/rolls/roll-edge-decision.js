import { createAwaitableDecision } from './awaitable-decision.js';

/**
 * @typedef {{ successes: number, rolledDice: number, isGlitch: boolean, isCriticalGlitch?: boolean }} EdgeRollResult
 */

/** @type {import('./awaitable-decision.js').AwaitableDecisionApi<number, { rollResult: EdgeRollResult }>} */
const edgeDecisions = createAwaitableDecision();

/**
 * @param {string} messageId
 * @returns {ReturnType<typeof edgeDecisions.get>}
 */
export function getEdgeDecisionEntry(messageId) {
  return edgeDecisions.get(messageId);
}

/**
 * @param {{ messageId: string | null, actor: import('@documents/index').SR4Actor, rollResult: EdgeRollResult }} options
 * @returns {Promise<number>}
 */
export async function awaitEdgeDecision({ messageId, actor, rollResult }) {
  if (!messageId || actor.getAttribute('CURRENTEDGE') <= 0) {
    return rollResult.successes;
  }

  const message = game.messages?.get(messageId);
  if (!message) return rollResult.successes;

  const timeoutSeconds =
    game.settings.get('shadowrun4e', 'flowEdgeTimeout') ?? 20;
  const promise = edgeDecisions.park({
    messageId,
    timeoutMs: timeoutSeconds * 1000,
    getDefault: () => rollResult.successes,
    onTimeout: () => resolveEdgeDecision(messageId),
    extra: { rollResult },
  });

  await message.update({
    'flags.sr4.edgeDecision': { pending: true, resolved: false },
  });

  return promise;
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Record<string, unknown> & { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed?: boolean, messageId: string | null } | null | undefined} result
 * @returns {Promise<number | null>}
 */
export async function resolveFinalSuccesses(actor, result) {
  if (!result || result.isGlitch) return null;
  return resolveEdgeForRoll(
    actor,
    /** @type {{ successes: number, rolledDice: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null }} */ (
      result
    ),
    Infinity
  );
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {Record<string, unknown> & { successes: number, isGlitch: boolean, rolledDice: number, edgeUsed?: boolean, messageId: string | null } | null | undefined} result
 * @param {(finalSuccesses: number) => void} onSuccess
 * @returns {Promise<void>}
 */
export async function resolveFinalSuccessesAndEmit(actor, result, onSuccess) {
  const finalSuccesses = await resolveFinalSuccesses(actor, result);
  if (finalSuccesses === null) return;
  if (finalSuccesses > 0) onSuccess(finalSuccesses);
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{ successes: number, rolledDice: number, isGlitch: boolean, edgeUsed: boolean, messageId: string | null }} roll
 * @param {number} threshold
 * @returns {Promise<number>}
 */
export async function resolveEdgeForRoll(actor, roll, threshold) {
  const { successes, rolledDice, isGlitch, edgeUsed, messageId } = roll;
  if (edgeUsed || successes >= threshold) return successes;
  return awaitEdgeDecision({
    messageId,
    actor,
    rollResult: { successes, rolledDice, isGlitch },
  });
}

/**
 * @param {import('@documents/index').SR4Actor} actor
 * @param {{successes: number, isGlitch: boolean, rolledDice: number, edgeUsed: boolean, messageId: string | null}} rollResult
 * @param {number} [threshold]
 * @returns {Promise<number>}
 */
export async function offerEdgeRetry(actor, rollResult, threshold = 0) {
  if (rollResult.edgeUsed || rollResult.isGlitch) return rollResult.successes;
  return resolveEdgeForRoll(
    actor,
    {
      successes: rollResult.successes,
      rolledDice: rollResult.rolledDice,
      isGlitch: rollResult.isGlitch,
      edgeUsed: rollResult.edgeUsed,
      messageId: rollResult.messageId,
    },
    threshold
  );
}

/**
 * @param {string} messageId
 * @param {number} [finalSuccesses]
 * @returns {Promise<void>}
 */
export async function resolveEdgeDecision(messageId, finalSuccesses) {
  edgeDecisions.settle(messageId, finalSuccesses);
  const message = game.messages?.get(messageId);
  if (
    message &&
    !message.flags?.sr4?.edgeDecision?.resolved &&
    message.isAuthor
  ) {
    await message.update({ 'flags.sr4.edgeDecision.resolved': true });
  }
}
